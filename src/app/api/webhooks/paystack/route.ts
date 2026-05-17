import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { PLAN_CREDITS } from "@/lib/constants";
import { revalidateTag } from "next/cache";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;



const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// ─── Helper: propagate subscription mirrors to all orgs owned by a user ────────
async function propagateToOrgMirrors(
  supabase: ReturnType<typeof createClient<Database>>,
  userId: string,
  mirrorData: Record<string, unknown>,
): Promise<void> {
  const { data: ownedOrgs } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("role", "owner");

  if (!ownedOrgs || ownedOrgs.length === 0) return;

  const orgIds = ownedOrgs
    .map((m) => m.organization_id)
    .filter((id): id is string => id !== null);

  if (orgIds.length === 0) return;

  await supabase
    .from("organizations")
    .update({ ...mirrorData, updated_at: new Date().toISOString() })
    .in("id", orgIds);
}

export async function POST(req: NextRequest) {
  if (!PAYSTACK_SECRET_KEY) {
    console.error("Missing PAYSTACK_SECRET_KEY");
    return NextResponse.json({ error: "Server config error" }, { status: 500 });
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: "Server config error" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(body)
    .digest("hex");

  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const { data } = event;

  console.log("Paystack Webhook:", event.event, data.reference);

  const supabase = createClient<Database>(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const eventType: string = event.event;
    const orgId: string | undefined = data.metadata?.org_id;

    if (!orgId) {
      console.warn("Missing org_id in Paystack metadata", data.metadata);
      return NextResponse.json({ status: "ignored: no org_id" });
    }

    // ── Resolve the org owner (user_subscriptions is user-scoped) ─────────────
    const { data: ownerMember } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", orgId)
      .eq("role", "owner")
      .single();
    const ownerId: string | undefined = ownerMember?.user_id ?? undefined;

    if (!ownerId) {
      console.warn("[Webhook] Could not resolve owner for org:", orgId);
      return NextResponse.json({ status: "ignored: no owner found" });
    }

    switch (eventType) {
      // ──────────────────────────────────────────────────────────────────────
      // Payment confirmed — branches into subscription, credit pack, or ad budget
      // ──────────────────────────────────────────────────────────────────────
      case "charge.success": {
        // Idempotency check: verify this payment hasn't already been processed
        const { data: existingTransaction } = await supabase
          .from("transactions")
          .select("id")
          .eq("provider_reference", data.reference)
          .maybeSingle();

        if (existingTransaction) {
          console.log(`[Webhook] Payment ${data.reference} already processed, skipping`);
          return NextResponse.json({ status: "already_processed" });
        }

        const txType: string = data.metadata?.tx_type || "subscription";

        // ── Credit Pack Top-Up ──────────────────────────────────────────────
        if (txType === "credit_pack") {
          const packCredits: number = data.metadata?.credits ?? 0;
          const packName: string = data.metadata?.pack_name ?? "Credit Pack";

          const { error: txError } = await supabase.from("transactions").insert({
            organization_id: orgId,
            amount_cents: data.amount,
            currency: data.currency ?? "NGN",
            type: "credit_pack_purchase",
            description: `${packName} - ${packCredits} credits`,
            payment_provider: "paystack",
            provider_reference: data.reference,
            status: "success",
          });

          if (txError?.code === "23505") {
            console.log(`[Webhook] Payment ${data.reference} already inserted, skipping credit grant`);
            return NextResponse.json({ status: "already_processed" });
          } else if (txError) {
            console.error("Failed to insert transaction:", txError);
          }

          const { error: creditError } = await supabase.rpc("add_credits", {
            p_user_id: ownerId,
            p_credits: packCredits,
            p_reason: `credit_pack:${packName.toLowerCase().replace(/ /g, "_")}`,
            p_org_id: orgId,
          });
          if (creditError) console.error("Failed to add pack credits:", creditError);

          console.log(`Credit pack: +${packCredits} credits for user ${ownerId}`);

        } else if (txType === "card_authorization") {
          // ── ₦0 Card Authorization — store card fingerprint on user_subscriptions ─
          const auth = data.authorization ?? {};
          if (auth.reusable && auth.authorization_code) {
            await supabase
              .from("user_subscriptions")
              .upsert(
                {
                  user_id: ownerId,
                  paystack_authorization_code: auth.authorization_code,
                  paystack_card_last4: auth.last4 ?? null,
                  paystack_card_type: auth.card_type ?? null,
                  paystack_card_bank: auth.bank ?? null,
                  paystack_card_expiry:
                    auth.exp_month && auth.exp_year
                      ? `${auth.exp_month}/${auth.exp_year}`
                      : null,
                  paystack_customer_code: data.customer?.customer_code ?? null,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id" },
              );
            console.log(`[Webhook] Card stored for user ${ownerId}: ***${auth.last4}`);
          }

        } else {
          // ── Subscription Payment ───────────────────────────────────────────
          const planId: string = data.metadata?.plan_id || "starter";
          const planInterval: string = data.metadata?.plan_interval || "monthly";
          const creditsToGrant = PLAN_CREDITS[planId] ?? PLAN_CREDITS.starter;
          const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS).toISOString();

          // Build card fingerprint update if available
          const auth = data.authorization ?? {};
          const cardUpdate =
            auth.reusable && auth.authorization_code
              ? {
                  paystack_authorization_code: auth.authorization_code,
                  paystack_card_last4: auth.last4 ?? null,
                  paystack_card_type: auth.card_type ?? null,
                  paystack_card_bank: auth.bank ?? null,
                  paystack_card_expiry:
                    auth.exp_month && auth.exp_year
                      ? `${auth.exp_month}/${auth.exp_year}`
                      : null,
                }
              : {};

          // ── Write authoritative state to user_subscriptions ────────────────
          const { error: subError } = await supabase
            .from("user_subscriptions")
            .upsert(
              {
                user_id: ownerId,
                subscription_status: "active",
                subscription_tier: planId as "starter" | "growth" | "agency",
                subscription_expires_at: expiresAt,
                subscription_grace_ends_at: null,
                plan_interval: planInterval,
                paystack_customer_code: data.customer?.customer_code ?? null,
                updated_at: new Date().toISOString(),
                ...cardUpdate,
              },
              { onConflict: "user_id" },
            );

          if (subError) console.error("[Webhook] Failed to upsert user_subscriptions:", subError);

          // ── Propagate mirrors to all owned orgs ────────────────────────────
          await propagateToOrgMirrors(supabase, ownerId, {
            subscription_status: "active",
            subscription_tier: planId,
            subscription_expires_at: expiresAt,
            plan_interval: planInterval,
          });
          // ── Record transaction (org-scoped for invoice history) ───────────
          const { error: subTxError } = await supabase.from("transactions").insert({
            organization_id: orgId,
            amount_cents: data.amount,
            currency: data.currency ?? "NGN",
            type: "subscription_payment",
            description: `${planId} plan - ${planInterval}`,
            payment_provider: "paystack",
            provider_reference: data.reference,
            status: "success",
          });

          if (subTxError?.code === "23505") {
            console.log(`[Webhook] Payment ${data.reference} already inserted, skipping sub grant`);
            return NextResponse.json({ status: "already_processed" });
          } else if (subTxError) {
            console.error("Failed to insert transaction:", subTxError);
          }

          // ── Grant credits (user-scoped) ────────────────────────────────────
          await supabase
            .from("users")
            .update({ plan_credits_quota: creditsToGrant })
            .eq("id", ownerId);

          const { error: creditError } = await supabase.rpc("add_credits", {
            p_user_id: ownerId,
            p_credits: creditsToGrant,
            p_reason: `plan_renewal:${planId}`,
            p_org_id: orgId,
          });
          if (creditError) console.error("Failed to grant credits:", creditError);

          revalidateTag(`dashboard-${orgId}`, "minutes");
          revalidateTag(`campaigns-${orgId}`, "minutes");

          console.log(
            `[Webhook] Activated ${planId} for user ${ownerId}, granted ${creditsToGrant} credits`,
          );
        }
        break;
      }

      // ──────────────────────────────────────────────────────────────────────
      // Paystack subscription object created — store the sub_code
      // ──────────────────────────────────────────────────────────────────────
      case "subscription.create": {
        await supabase
          .from("user_subscriptions")
          .upsert(
            {
              user_id: ownerId,
              paystack_sub_code: data.subscription_code,
              subscription_status: "active",
              // Clear the pending upgrade flag — user has now subscribed at the correct tier
              pending_paystack_plan_upgrade: false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );

        // Propagate status mirror (sub_code stays on user_subscriptions only)
        await propagateToOrgMirrors(supabase, ownerId, {
          subscription_status: "active",
        });
        break;
      }

      // ──────────────────────────────────────────────────────────────────────
      // Subscription cancelled / not renewing
      // ──────────────────────────────────────────────────────────────────────
      case "subscription.disable":
      case "subscription.not_renew":
        await supabase
          .from("user_subscriptions")
          .update({ subscription_status: "canceled", updated_at: new Date().toISOString() })
          .eq("user_id", ownerId);

        await propagateToOrgMirrors(supabase, ownerId, {
          subscription_status: "canceled",
        });
        break;

      // ──────────────────────────────────────────────────────────────────────
      // Payment failed — apply 3-day grace period before access is revoked.
      // Nigerian banks have high retry failure rates; this prevents immediate
      // lockout due to temporary bank network issues.
      // ──────────────────────────────────────────────────────────────────────
      case "invoice.payment_failed": {
        const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
        const graceEndsAt = new Date(Date.now() + THREE_DAYS_MS).toISOString();

        await supabase
          .from("user_subscriptions")
          .update({
            subscription_status: "past_due",
            subscription_grace_ends_at: graceEndsAt,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", ownerId);

        await propagateToOrgMirrors(supabase, ownerId, {
          subscription_status: "past_due",
        });

        // Insert an internal notification for the user
        await supabase.from("notifications").insert({
          user_id: ownerId,
          title: "Payment Failed",
          message: "Your recent payment failed. You have a 3-day grace period to update your billing details before your subscription is paused.",
          type: "billing",
          category: "warning",
          action_label: "Update Payment Method",
          action_url: "/settings/subscription",
          dedup_key: `payment_failed_${new Date().toISOString().split("T")[0]}`,
        });

        console.log(
          `[Webhook] Payment failed for user ${ownerId}. Grace period until ${graceEndsAt}`,
        );
        break;
      }
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ status: "success" });
}
