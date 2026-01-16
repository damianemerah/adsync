"use server";

import { createClient } from "@/lib/supabase/server";

export async function initiateSubscription(
  planId: string,
  amountString: string
) {
  const supabase = await createClient();

  // 1. Get User
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) throw new Error("Unauthorized");

  // 2. Get Organization ID
  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!member) throw new Error("No organization found");

  // 3. Clean Amount (Remove ₦ and commas)
  // "₦25,000" -> 25000
  const amountNGN = parseInt(amountString.replace(/[^0-9]/g, ""));
  const amountKobo = amountNGN * 100; // Paystack takes Kobo

  // 4. Create a Pending Transaction Record in DB
  const reference = `adsync_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const { error: dbError } = await supabase.from("transactions").insert({
    organization_id: member.organization_id,
    amount_cents: amountKobo,
    currency: "NGN",
    type: "subscription_payment",
    description: `Subscription: ${planId}`,
    payment_provider: "paystack",
    provider_reference: reference,
    status: "pending",
  });

  if (dbError) {
    console.error(dbError);
    throw new Error("Failed to create transaction record");
  }

  // 5. Call Paystack API
  try {
    const paystackRes = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: amountKobo,
          reference: reference,
          // Redirect back to billing page after payment
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
          metadata: {
            organization_id: member.organization_id,
            plan_id: planId,
          },
        }),
      }
    );

    const data = await paystackRes.json();

    if (!data.status) {
      throw new Error(data.message || "Paystack initialization failed");
    }

    // 6. Return the Checkout URL
    return { url: data.data.authorization_url };
  } catch (err: any) {
    console.error("Paystack Error:", err);
    throw new Error("Connection to payment provider failed.");
  }
}
