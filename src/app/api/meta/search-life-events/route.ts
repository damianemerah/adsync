import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MetaService } from "@/lib/api/meta";
import { decrypt } from "@/lib/crypto";
import { getActiveOrgId } from "@/lib/active-org";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

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
    .select("access_token, platform_account_id")
    .eq("organization_id", activeOrgId)
    .eq("platform", "meta")
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
    const results = await MetaService.searchLifeEvents(
      accessToken,
      adAccount.platform_account_id,
      query,
    );

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
