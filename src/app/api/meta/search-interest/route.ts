import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MetaService } from "@/lib/api/meta";
import { decrypt } from "@/lib/crypto";

export async function GET(request: Request) {
  console.log("Search interest");
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

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!member || !member.organization_id) {
    return NextResponse.json(
      { error: "No organization found" },
      { status: 404 },
    );
  }

  // Fetch ad account token
  const { data: adAccount } = await supabase
    .from("ad_accounts")
    .select("access_token")
    .eq("organization_id", member.organization_id)
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

  console.log("Searching for interest", query);

  try {
    const accessToken = decrypt(adAccount.access_token);
    const results = await MetaService.searchInterests(
      accessToken,
      query as string,
    );
    console.log("Results", results);
    return NextResponse.json(results);
  } catch (error: any) {
    console.log("Error📁", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
