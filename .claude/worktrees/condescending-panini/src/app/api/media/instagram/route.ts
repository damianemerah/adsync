import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { getActiveOrgId } from "@/lib/active-org";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // 2. Get active organization
  const activeOrgId = await getActiveOrgId();
  if (!activeOrgId) return new Response("No Org", { status: 400 });

  // 3. Get the Meta Access Token from DB
  const { data: account } = await supabase
    .from("ad_accounts")
    .select("access_token")
    .eq("organization_id", activeOrgId)
    .eq("platform", "meta")
    .eq("health_status", "healthy") // Only use working tokens
    .limit(1)
    .single();

  if (!account) {
    return NextResponse.json({ posts: [] }); // No connected account
  }

  try {
    const accessToken = decrypt(account.access_token);

    // 4. Find the Instagram Business ID
    // User -> Facebook Pages -> Linked Instagram Account
    const pagesUrl = `https://graph.facebook.com/v22.0/me/accounts?fields=instagram_business_account{id,username,profile_picture_url}&access_token=${accessToken}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();

    // Find first page with an IG account connected
    const igAccount = pagesData.data?.find(
      (p: any) => p.instagram_business_account
    )?.instagram_business_account;

    if (!igAccount) {
      return NextResponse.json(
        {
          error:
            "No Instagram Business account found linked to your Facebook Pages.",
        },
        { status: 404 }
      );
    }

    // 4. Fetch Media from that IG Account
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get("cursor"); // Get the cursor

    // Update URL construction
    let mediaUrl = `https://graph.facebook.com/v24.0/${igAccount.id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,like_count,comments_count,timestamp&limit=10&access_token=${accessToken}`;

    // Append cursor if exists
    if (cursor) {
      mediaUrl += `&after=${cursor}`;
    }
    const mediaRes = await fetch(mediaUrl);
    const mediaData = await mediaRes.json();

    // 5. Transform for UI
    const posts =
      mediaData.data?.map((post: any) => ({
        id: post.id,
        platform: "instagram",
        thumbnail: post.thumbnail_url || post.media_url,
        media_url: post.media_url,
        caption: post.caption || "No caption",
        likes: post.like_count || 0,
        comments: post.comments_count || 0,
        postedAt: new Date(post.timestamp).toLocaleDateString(),
        media_type: post.media_type,
        permalink: post.permalink,
      })) || [];

    return NextResponse.json({
      posts,
      nextCursor: mediaData.paging?.cursors?.after || null,
    });
  } catch (error) {
    console.error("IG Fetch Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch media" },
      { status: 500 }
    );
  }
}
