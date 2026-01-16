import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { PLAN_PRICES } from "@/lib/constants";
import { sendNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    console.log("Paystack Webhook Received⭐⭐");
    const secret = process.env.PAYSTACK_SECRET_KEY!;
    const body = await request.text(); // Get raw body
    const hash = crypto.createHmac("sha512", secret).update(body).digest("hex");

    // 1. Verify Signature (Security)
    if (hash !== request.headers.get("x-paystack-signature")) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    // 2. Handle Charge Success
    if (event.event === "charge.success") {
      const { reference, metadata } = event.data;
      const orgId = metadata?.organization_id;
      const planId = metadata?.plan_id;

      if (orgId) {
        // USE SERVICE ROLE KEY TO BYPASS RLS
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        );

        // A. Fetch Current Subscription State
        const { data: currentOrg } = await supabase
          .from("organizations")
          .select(
            "subscription_tier, subscription_expires_at, subscription_status"
          )
          .eq("id", orgId)
          .single();

        let newExpiry = new Date();
        const now = new Date();
        const currentExpiry = currentOrg?.subscription_expires_at
          ? new Date(currentOrg.subscription_expires_at)
          : null;

        // --- PRORATION LOGIC START ---
        let unusedValue = 0;
        const paymentAmountNaira = (event.data.amount || 0) / 100;

        // Only calculate unused value if they are active and expiry is in future
        if (
          currentOrg?.subscription_status === "active" &&
          currentExpiry &&
          currentExpiry > now
        ) {
          // 1. Calculate Unused Days
          const msPerDay = 1000 * 60 * 60 * 24;
          const daysLeft = (currentExpiry.getTime() - now.getTime()) / msPerDay;

          // 2. Calculate Unused Value based on OLD plan price
          const oldPlanPrice = PLAN_PRICES[currentOrg.subscription_tier] || 0;
          const oldDailyRate = oldPlanPrice / 30;

          if (daysLeft > 0) {
            unusedValue = daysLeft * oldDailyRate;
          }
        }

        // 3. Calculate New Duration
        const totalCredit = paymentAmountNaira + unusedValue;
        const newPlanPrice = PLAN_PRICES[planId] || paymentAmountNaira; // Fallback to paid amount
        const newDailyRate = newPlanPrice / 30;

        const daysToAdd = newDailyRate > 0 ? totalCredit / newDailyRate : 30; // Fallback to 30 days if rate is 0

        // 4. Set New Expiry
        newExpiry = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
        // --- PRORATION LOGIC END ---

        // B. Update Database
        await supabase
          .from("transactions")
          .update({ status: "success" })
          .eq("provider_reference", reference);

        const { error } = await supabase
          .from("organizations")
          .update({
            subscription_status: "active",
            subscription_tier: planId || "growth",
            subscription_expires_at: newExpiry.toISOString(),
          })
          .eq("id", orgId);

        if (error) console.error("Failed to update org subscription:", error);

        // C. Send Notification to Owner
        const { data: owner } = await supabase
          .from("organization_members")
          .select("user_id")
          .eq("organization_id", orgId)
          .eq("role", "owner")
          .single();

        if (owner) {
          await sendNotification({
            userId: owner.user_id,
            organizationId: orgId,
            title: "Subscription Active",
            message:
              "Your payment was successful. You now have full access to AdSync.",
            type: "success",
            category: "budget",
            actionUrl: "/billing",
            actionLabel: "View Receipt",
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook Error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
