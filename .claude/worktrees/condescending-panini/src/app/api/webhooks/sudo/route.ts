import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

const SUDO_WEBHOOK_SECRET = process.env.SUDO_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Sudo Africa Webhook Handler
 *
 * Handles webhook events from Sudo Africa for:
 * - card.created - Virtual card creation confirmation
 * - card.transaction.authorized - Real-time transaction authorization
 * - card.transaction.completed - Transaction settlement
 * - card.transaction.declined - Declined transaction
 * - account.funded - USD account funding confirmation
 * - card.frozen - Card frozen by Sudo
 * - card.blocked - Card blocked permanently
 *
 * Documentation: https://docs.sudo.africa/webhooks
 */
export async function POST(req: NextRequest) {
  if (!SUDO_WEBHOOK_SECRET) {
    console.error("Missing SUDO_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Server config error" }, { status: 500 });
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: "Server config error" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-sudo-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Verify Sudo webhook signature
  // ──────────────────────────────────────────────────────────────────────────
  const hash = crypto
    .createHmac("sha256", SUDO_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (hash !== signature) {
    console.error("Invalid Sudo webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const { type, data } = event;

  console.log("Sudo Webhook:", type, data.id || data.cardId || data.accountId);

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    switch (type) {
      // ────────────────────────────────────────────────────────────────────────
      // Card Created - Confirmation that card was created successfully
      // ────────────────────────────────────────────────────────────────────────
      case "card.created": {
        console.log(`Card created: ${data.id} (${data.last4})`);

        // Card should already be in database (created by server action)
        // Just update status to confirm
        await supabase
          .from("virtual_cards")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("provider_card_id", data.id);

        break;
      }

      // ────────────────────────────────────────────────────────────────────────
      // Account Funded - USD account received funds
      // ────────────────────────────────────────────────────────────────────────
      case "account.funded": {
        const accountId = data.id || data.accountId;
        const amount = data.amount;
        const currency = data.currency || "USD";

        console.log(`Account ${accountId} funded with ${amount} ${currency}`);

        // Find card by account ID
        const { data: card } = await supabase
          .from("virtual_cards")
          .select("id, organization_id")
          .eq("provider_account_id", accountId)
          .single();

        if (!card) {
          console.warn(`No card found for account ${accountId}`);
          break;
        }

        // Update card balance
        await supabase
          .from("virtual_cards")
          .update({
            balance_usd: amount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", card.id);

        console.log(`✅ Updated card ${card.id} balance to $${amount}`);
        break;
      }

      // ────────────────────────────────────────────────────────────────────────
      // Transaction Authorized - Real-time authorization request
      // This happens when Meta attempts to charge the card
      // ────────────────────────────────────────────────────────────────────────
      case "card.transaction.authorized": {
        const cardId = data.cardId;
        const amount = data.amount;
        const merchantName = data.merchantName || data.merchant?.name || "Unknown";
        const authorizationId = data.id || data.authorizationId;

        console.log(
          `Transaction authorized: ${authorizationId} - ${merchantName} - $${amount}`,
        );

        // Find card
        const { data: card } = await supabase
          .from("virtual_cards")
          .select("id, organization_id, balance_usd")
          .eq("provider_card_id", cardId)
          .single();

        if (!card) {
          console.warn(`No card found for Sudo card ${cardId}`);
          break;
        }

        // Optional: Log authorization for monitoring
        console.log(
          `Card ${card.id} (org ${card.organization_id}) authorized $${amount} to ${merchantName}`,
        );

        break;
      }

      // ────────────────────────────────────────────────────────────────────────
      // Transaction Completed - Settlement confirmed
      // Record actual spend in transactions table
      // ────────────────────────────────────────────────────────────────────────
      case "card.transaction.completed": {
        const cardId = data.cardId;
        const amount = data.amount;
        const merchantName = data.merchantName || data.merchant?.name || "Unknown";
        const merchantCategory = data.merchantCategory || data.mcc || "Unknown";
        const transactionId = data.id || data.transactionId;
        const settledAmount = data.settledAmount || amount;

        console.log(
          `Transaction completed: ${transactionId} - ${merchantName} - $${settledAmount}`,
        );

        // Find card
        const { data: card } = await supabase
          .from("virtual_cards")
          .select("id, organization_id, balance_usd")
          .eq("provider_card_id", cardId)
          .single();

        if (!card) {
          console.warn(`No card found for Sudo card ${cardId}`);
          break;
        }

        // Record transaction in ad budget transactions
        await supabase.from("ad_budget_transactions").insert({
          organization_id: card.organization_id,
          type: "spend",
          amount_ngn: 0, // Not applicable for USD spend
          amount_usd: settledAmount,
          balance_after: 0, // Not tracking Naira balance here
          reference: transactionId,
          description: `Meta ad spend: ${merchantName}`,
          metadata: {
            card_id: card.id,
            merchant_name: merchantName,
            merchant_category: merchantCategory,
            sudo_transaction_id: transactionId,
            authorization_id: data.authorizationId,
          },
        });

        // Update card balance (if provided in webhook)
        if (data.remainingBalance !== undefined) {
          await supabase
            .from("virtual_cards")
            .update({
              balance_usd: data.remainingBalance,
              updated_at: new Date().toISOString(),
            })
            .eq("id", card.id);
        }

        console.log(
          `✅ Recorded $${settledAmount} spend from org ${card.organization_id} at ${merchantName}`,
        );

        break;
      }

      // ────────────────────────────────────────────────────────────────────────
      // Transaction Declined - Authorization failed
      // ────────────────────────────────────────────────────────────────────────
      case "card.transaction.declined": {
        const cardId = data.cardId;
        const amount = data.amount;
        const merchantName = data.merchantName || data.merchant?.name || "Unknown";
        const declineReason = data.declineReason || data.reason || "Unknown";

        console.log(
          `Transaction declined: ${merchantName} - $${amount} - Reason: ${declineReason}`,
        );

        // Find card
        const { data: card } = await supabase
          .from("virtual_cards")
          .select("id, organization_id")
          .eq("provider_card_id", cardId)
          .single();

        if (!card) {
          console.warn(`No card found for Sudo card ${cardId}`);
          break;
        }

        // Optional: Send notification to organization
        // TODO: Implement notification system
        console.warn(
          `Card ${card.id} (org ${card.organization_id}) declined $${amount} at ${merchantName}: ${declineReason}`,
        );

        break;
      }

      // ────────────────────────────────────────────────────────────────────────
      // Card Frozen - Sudo froze the card (e.g., suspicious activity)
      // ────────────────────────────────────────────────────────────────────────
      case "card.frozen": {
        const cardId = data.id || data.cardId;
        const reason = data.reason || "Unknown";

        console.log(`Card frozen: ${cardId} - Reason: ${reason}`);

        await supabase
          .from("virtual_cards")
          .update({
            status: "frozen",
            updated_at: new Date().toISOString(),
          })
          .eq("provider_card_id", cardId);

        // TODO: Send alert to organization
        console.warn(`Card ${cardId} frozen by Sudo: ${reason}`);

        break;
      }

      // ────────────────────────────────────────────────────────────────────────
      // Card Blocked - Permanent block (cannot be reversed)
      // ────────────────────────────────────────────────────────────────────────
      case "card.blocked": {
        const cardId = data.id || data.cardId;
        const reason = data.reason || "Unknown";

        console.log(`Card blocked: ${cardId} - Reason: ${reason}`);

        await supabase
          .from("virtual_cards")
          .update({
            status: "terminated",
            updated_at: new Date().toISOString(),
          })
          .eq("provider_card_id", cardId);

        // TODO: Send critical alert to organization
        console.error(`Card ${cardId} permanently blocked by Sudo: ${reason}`);

        break;
      }

      // ────────────────────────────────────────────────────────────────────────
      // Unknown event type
      // ────────────────────────────────────────────────────────────────────────
      default:
        console.log(`Unhandled Sudo webhook event: ${type}`);
        break;
    }
  } catch (error) {
    console.error("Sudo webhook processing error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ status: "success" });
}
