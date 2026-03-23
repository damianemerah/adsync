import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Plan -> monthly credit quota (mirrors plan_definitions table)
const PLAN_CREDITS: Record<string, number> = {
  starter: 150,
  growth: 400,
  agency: 1200,
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

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

    // Resolve the org owner (credits are user-scoped)
    const { data: ownerMember } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", orgId)
      .eq("role", "owner")
      .single();
    const ownerId: string | undefined = ownerMember?.user_id ?? undefined;

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
          .single();

        if (existingTransaction) {
          console.log(`[Webhook] Payment ${data.reference} already processed, skipping`);
          return NextResponse.json({ status: "already_processed" });
        }

        const txType: string = data.metadata?.tx_type || "subscription";

        // ── Credit Pack Top-Up ──────────────────────────────────────
        if (txType === "credit_pack") {
          // ── Credit Pack Top-Up ─────────────────────────────────────────────
          const packCredits: number = data.metadata?.credits ?? 0;
          const packName: string = data.metadata?.pack_name ?? "Credit Pack";

          await supabase.from("transactions").upsert(
            {
              organization_id: orgId,
              amount_cents: data.amount,
              currency: data.currency ?? "NGN",
              type: "credit_pack_purchase",
              description: `${packName} - ${packCredits} credits`,
              payment_provider: "paystack",
              provider_reference: data.reference,
              status: "success",
            },
            { onConflict: "provider_reference" },
          );

          if (ownerId) {
            const { error: creditError } = await supabase.rpc("add_credits", {
              p_user_id: ownerId,
              p_credits: packCredits,
              p_reason: `credit_pack:${packName.toLowerCase().replace(/ /g, "_")}`,
              p_org_id: orgId,
            });
            if (creditError)
              console.error("Failed to add pack credits:", creditError);
          }
          console.log(`Credit pack: +${packCredits} credits for org ${orgId}`);
        } else {
          // ── Subscription Payment ───────────────────────────────────────────
          const planId: string = data.metadata?.plan_id || "starter";
          const planInterval: string =
            data.metadata?.plan_interval || "monthly";
          const creditsToGrant = PLAN_CREDITS[planId] ?? 150;
          const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS).toISOString();

          const { error: orgError } = await supabase
            .from("organizations")
            .update({
              subscription_status: "active",
              subscription_tier: planId as "starter" | "growth" | "agency",
              subscription_expires_at: expiresAt,
              plan_interval: planInterval,
              paystack_customer_code: data.customer?.customer_code ?? undefined,
              updated_at: new Date().toISOString(),
            })
            .eq("id", orgId);

          if (orgError) console.error("Failed to activate org:", orgError);

          await supabase.from("transactions").upsert(
            {
              organization_id: orgId,
              amount_cents: data.amount,
              currency: data.currency ?? "NGN",
              type: "subscription_payment",
              description: `${planId} plan - ${planInterval}`,
              payment_provider: "paystack",
              provider_reference: data.reference,
              status: "success",
            },
            { onConflict: "provider_reference" },
          );

          if (ownerId) {
            // Update user-level quota and grant credits
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
            if (creditError)
              console.error("Failed to grant credits:", creditError);
          }
          console.log(
            `Activated ${planId} for org ${orgId}, granted ${creditsToGrant} credits`,
          );
        }
        break;
      }

      // ──────────────────────────────────────────────────────────────────────
      // Paystack subscription object created
      // ──────────────────────────────────────────────────────────────────────
      case "subscription.create": {
        await supabase
          .from("organizations")
          .update({
            paystack_sub_code: data.subscription_code,
            subscription_status: "active",
          })
          .eq("id", orgId);
        break;
      }

      // ──────────────────────────────────────────────────────────────────────
      // Subscription cancelled / not renewing
      // ──────────────────────────────────────────────────────────────────────
      case "subscription.disable":
      case "subscription.not_renew":
        await supabase
          .from("organizations")
          .update({ subscription_status: "canceled" })
          .eq("id", orgId);
        break;

      // ──────────────────────────────────────────────────────────────────────
      // Payment failed
      // ──────────────────────────────────────────────────────────────────────
      case "invoice.payment_failed":
        await supabase
          .from("organizations")
          .update({ subscription_status: "past_due" })
          .eq("id", orgId);
        break;
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ status: "success" });
}
