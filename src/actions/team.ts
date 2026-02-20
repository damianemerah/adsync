"use server";

import { createClient } from "@/lib/supabase/server";
import { sendTeamInviteEmail } from "@/lib/resend";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function inviteTeamMember(
  email: string,
  role: "editor" | "viewer",
) {
  const supabase = await createClient();

  // 1. Get Current User & Org
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(name)")
    .eq("user_id", user.id)
    .single();

  if (!member || !member.organizations)
    throw new Error("No organization found");

  const orgId = member.organization_id;
  // @ts-ignore
  const orgName = member.organizations.name;
  const inviterName = user.user_metadata.full_name || user.email;

  // 2. Check Plan Limits (Optional Gatekeeper)
  // const count = await supabase.from('organization_members').select('*', { count: 'exact' })...

  // 3. Create Invitation Record
  const token = randomUUID(); // Generate unique token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 Days expiry

  const { error: dbError } = await supabase.from("invitations").insert({
    organization_id: orgId,
    email,
    role,
    invited_by: user.id,
    token,
    expires_at: expiresAt.toISOString(),
  });

  if (dbError) {
    console.error(dbError);
    if (dbError.code === "23505")
      throw new Error("This user is already invited.");
    throw new Error("Failed to create invitation");
  }

  // 4. Send Email
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;
  await sendTeamInviteEmail(email, inviterName, orgName, inviteUrl);

  revalidatePath("/settings/team");
  return { success: true };
}

export async function revokeInvitation(id: string) {
  const supabase = await createClient();
  // Ensure user owns the org via RLS
  await supabase.from("invitations").delete().eq("id", id);
  revalidatePath("/settings/team");
}

export async function removeMember(userId: string) {
  const supabase = await createClient();
  // Ensure user owns the org via RLS
  await supabase.from("organization_members").delete().eq("user_id", userId);
  revalidatePath("/settings/team");
}
