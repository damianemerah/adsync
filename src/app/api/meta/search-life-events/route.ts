import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MetaService } from "@/lib/api/meta";
import { decrypt } from "@/lib/crypto";
import { getActiveOrgId } from "@/lib/active-org";
import OpenAI from "openai";
import {
  buildLifeEventCatalogPrompt,
  resolveLocalLifeEvent,
} from "@/lib/constants/meta-behaviors";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  timeout: 8000,
  maxRetries: 0,
});

/**
 * When the original query returns no results from Meta, use gpt-4o-mini
 * to map the AI-generated name to the closest valid catalog entry, then retry.
 */
async function remapWithAI(originalQuery: string): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const catalog = buildLifeEventCatalogPrompt();
    const res = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `Map this AI-generated Meta Ads life event name to the closest valid catalog entry.

AI-generated name: "${originalQuery}"

Valid catalog (pick exactly one, or reply "none"):
${catalog}

Reply with ONLY the exact catalog name, or the word "none".`,
    } as any);
    const answer = ((res as any)?.output_text || "").trim();
    if (!answer || answer.toLowerCase() === "none") return null;
    // Validate it's in the catalog
    return buildLifeEventCatalogPrompt().split(" | ").includes(answer)
      ? answer
      : null;
  } catch {
    return null;
  }
}

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
    let results = await MetaService.searchLifeEvents(
      accessToken,
      adAccount.platform_account_id,
      query,
    );

    // If no exact match found, and the query might be an LLM-hallucinated name,
    // try remapping via gpt-4o-mini then retry (server-side only, never reaches browser)
    const hasExact = results.some(
      (r: any) => r.name.toLowerCase() === query.toLowerCase(),
    );

    if (!hasExact && !resolveLocalLifeEvent(query)?.metaId) {
      const remapped = await remapWithAI(query);
      if (remapped && remapped !== query) {
        console.log(
          `[search-life-events] gpt-4o-mini remapped "${query}" → "${remapped}"`,
        );
        const retryResults = await MetaService.searchLifeEvents(
          accessToken,
          adAccount.platform_account_id,
          remapped,
        );
        if (retryResults.length > 0) results = retryResults;
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
