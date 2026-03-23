import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/active-org";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const activeOrgId = await getActiveOrgId();
  if (!activeOrgId) {
    return new Response("No active organization found", { status: 400 });
  }

  const appId = process.env.META_APP_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/connect/meta/callback`;

  // Combine user ID and active org ID so the callback knows which business context this is
  const state = `${user.id}:${activeOrgId}`;

  // UPDATED SCOPES: Added Pages, Lead Gen & Instagram permissions
  const scopes = [
    "ads_management",
    "ads_read",
    "business_management",
    "public_profile",
    "email",
    // Essential for finding the Page:
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_metadata",
    // Required for Lead Gen forms (read + manage):
    "pages_manage_ads",
    // Essential for finding the Instagram Account & Posts:
    "instagram_basic",
    "instagram_manage_insights",
  ].join(",");

  const url = `https://www.facebook.com/v25.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=${scopes}`;

  return redirect(url);
}
