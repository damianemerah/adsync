import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MetaService } from "@/lib/api/meta";
import { decrypt } from "@/lib/crypto";
import { getActiveOrgId } from "@/lib/active-org";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const type = searchParams.get("type") || "city";
  console.log("Location Query👇👇", query);
  console.log("Location Type👇👇", type);

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get active organization
  const activeOrgId = await getActiveOrgId();
  if (!activeOrgId) {
    return NextResponse.json(
      { error: "No organization found" },
      { status: 404 },
    );
  }

  // Fetch ad account token
  const { data: adAccount } = await supabase
    .from("ad_accounts")
    .select("access_token")
    .eq("organization_id", activeOrgId)
    .eq("platform", "meta")
    .eq("health_status", "healthy")
    .order("is_default", { ascending: false })
    .limit(1)
    .single();

  if (!adAccount?.access_token) {
    return NextResponse.json(
      { error: "No connected Meta ad account found" },
      { status: 400 },
    );
  }

  try {
    const accessToken = decrypt(adAccount.access_token);
    const results = await MetaService.searchLocation(
      accessToken,
      query as string,
      type as "city" | "region" | "country",
    );

    console.log(`[Meta API Geo] Search: query="${query}" type="${type}"`);
    console.log(`[Meta API Geo] Results for "${query}" (${results.length}):`);
    results.slice(0, 3).forEach((r: any, i: number) => {
      console.log(`  ${i + 1}. [${r.type}] ${r.name} (key: ${r.key}, region: ${r.region || 'none'}, region_id: ${r.region_id || 'none'})`);
    });
    
    return NextResponse.json(results);
  } catch (error: any) {
    console.log(`[Meta API Geo] Error for query="${query}":`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
