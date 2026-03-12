"use server";

import { decrypt } from "@/lib/crypto";
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
