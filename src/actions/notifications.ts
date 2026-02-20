"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function getNotificationSettings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  // Auto-create settings if not exist
  if (!data) {
    const { data: newData, error: createError } = await supabase
      .from("notification_settings")
      .insert({
        user_id: user.id,
        alert_low_funds: true,
        alert_payment_failed: true,
        alert_ad_rejected: true,
        alert_weekly_report: false,
      })
      .select()
      .single();

    if (createError) throw createError;
    return newData;
  }

  return data;
}

export async function updateNotificationSettings(
  settings: Partial<{
    alert_low_funds: boolean;
    alert_payment_failed: boolean;
    alert_ad_rejected: boolean;
    alert_weekly_report: boolean;
  }>,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("notification_settings")
    .update(settings)
    .eq("user_id", user.id);

  if (error) throw error;

  revalidatePath("/settings/notifications");
}

export async function startWhatsAppVerification(phoneNumber: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

  console.log(`[MOCK WHATSAPP] Sending OTP ${otp} to ${phoneNumber}`);

  const { error } = await supabase
    .from("notification_settings")
    // Use upsert to handle case where settings row doesn't exist yet
    .upsert(
      {
        user_id: user.id,
        whatsapp_number: phoneNumber,
        whatsapp_otp_code: otp,
        whatsapp_otp_expires_at: expiresAt,
        verified: false,
      },
      { onConflict: "user_id" },
    );

  if (error) throw error;

  return { success: true };
}

export async function confirmWhatsAppVerification(otp: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Fetch current OTP
  const { data: settings, error } = await supabase
    .from("notification_settings")
    .select("whatsapp_otp_code, whatsapp_otp_expires_at")
    .eq("user_id", user.id)
    .single();

  if (error || !settings) throw new Error("Verification session not found");

  if (settings.whatsapp_otp_code !== otp) {
    throw new Error("Invalid OTP");
  }

  if (new Date(settings.whatsapp_otp_expires_at!) < new Date()) {
    throw new Error("OTP expired");
  }

  // Success
  const { error: updateError } = await supabase
    .from("notification_settings")
    .update({
      verified: true,
      whatsapp_otp_code: null,
      whatsapp_otp_expires_at: null,
    })
    .eq("user_id", user.id);

  if (updateError) throw updateError;

  revalidatePath("/settings/notifications");
  return { success: true };
}

export async function disconnectWhatsApp() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("notification_settings")
    .update({
      verified: false,
      whatsapp_number: null,
    })
    .eq("user_id", user.id);

  if (error) throw error;

  revalidatePath("/settings/notifications");
}
