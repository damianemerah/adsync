import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MetaService } from "@/lib/api/meta";
import { decrypt } from "@/lib/crypto";
import { getActiveOrgId } from "@/lib/active-org";
import { resolveLocalInterest } from "@/lib/constants/meta-interests";

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

  console.log("Searching for interest", query);

  try {
    const accessToken = decrypt(adAccount.access_token);
    const accountId = adAccount.platform_account_id;
    let results = await MetaService.searchInterests(accessToken, accountId, query);

    const hasExact = results.some(
      (r: any) => r.name.toLowerCase() === query.toLowerCase(),
    );

    // If no exact match and not in local catalog, use adinterestvalid as truth-gate
    if (!hasExact && !resolveLocalInterest(query)?.metaId) {
      const validated = await MetaService.validateInterests(accessToken, [
        query,
      ]);
      const match = validated.find((v) => v.valid);
      if (match) {
        console.log(
          `[search-interest] adinterestvalid resolved "${query}" -> "${match.name}" (${match.id})`,
        );
        results = [{ id: match.id, name: match.name }];
      } else {
        // Extract primary keyword and retry search as last resort
        const keyword = query.split(/\s+/).slice(0, 2).join(" ");
        if (keyword !== query) {
          const retryResults = await MetaService.searchInterests(
            accessToken,
            accountId,
            keyword,
          );
          if (retryResults.length > 0) results = retryResults;
        }
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.log("Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
