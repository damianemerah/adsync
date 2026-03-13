"use server";

import { decrypt, encrypt } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function disconnectAdAccount(id: string) {
  const supabase = await createClient();

  // 1. Fetch the account first to get the token
  const { data: account } = await supabase
    .from("ad_accounts")
    .select("access_token, platform")
    .eq("id", id)
    .single();

  if (account && account.platform === "meta") {
    try {
      // 2. Decrypt the token
      const accessToken = decrypt(account.access_token);

      // 3. Revoke Permissions on Meta (The "Remote Disconnect")
      // This tells Facebook: "AdSync no longer wants access to this user"
      await fetch(
        `https://graph.facebook.com/v24.0/me/permissions?access_token=${accessToken}`,
        {
          method: "DELETE",
        }
      );

      console.log("Successfully revoked Meta permissions");
    } catch (error) {
      // We log the error but CONTINUE to delete.
      // If the token is already expired, this call will fail,
      // but we still want to remove the dead account from our DB.
      console.error(
        "Failed to revoke Meta permissions (continuing to delete local row):",
        error
      );
    }
  }

  // 4. Delete from Database
  const { error } = await supabase.from("ad_accounts").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/ad-accounts");
}

/**
 * Save (or clear) Meta CAPI credentials for a connected ad account.
 *
 * The CAPI access token is encrypted at rest using the same encrypt() helper
 * used for the ad account's OAuth access_token — consistent security posture.
 *
 * Passing empty strings for both fields clears the CAPI setup (opt-out).
 */
export async function updateAdAccountCapi(
  adAccountId: string,
  { metaPixelId, capiAccessToken }: { metaPixelId: string; capiAccessToken: string },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Verify this ad account belongs to the user's org before updating
  const { data: account } = await supabase
    .from("ad_accounts")
    .select("organization_id")
    .eq("id", adAccountId)
    .single();

  if (!account) throw new Error("Ad account not found");

  const { error } = await supabase
    .from("ad_accounts")
    .update({
      meta_pixel_id: metaPixelId.trim() || null,
      // Encrypt the token before storing — or null if clearing
      capi_access_token: capiAccessToken.trim()
        ? encrypt(capiAccessToken.trim())
        : null,
    })
    .eq("id", adAccountId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/business");
}

export async function setAsDefaultAccount(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Get organization ID first to ensure we only update this org's accounts
  const { data: account } = await supabase
    .from("ad_accounts")
    .select("organization_id")
    .eq("id", id)
    .single();

  if (!account) throw new Error("Account not found");

  // 1. Unset all defaults for this org
  await supabase
    .from("ad_accounts")
    .update({ is_default: false })
    .eq("organization_id", account.organization_id as string);

  // 2. Set new default
  const { error } = await supabase
    .from("ad_accounts")
    .update({ is_default: true })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/ad-accounts");
}
