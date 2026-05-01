"use server";

import OpenAI from "openai";
import { scrapeUrlFull, extractUrlFromMessage } from "@/lib/ai/url-scraper";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/active-org";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!, timeout: 15000 });

const EXTRACTION_SYSTEM = `
You are an ad creative strategist. Given scraped website content, extract:
1. Brand name (short, clean — no taglines, just the brand name)
2. Business description (1 sentence, what they sell/do)
3. A FLUX image generation prompt for a Facebook/Instagram ad (2-3 sentences, visual and specific)

The FLUX prompt must describe: the product/service visually, aesthetic/mood, color palette hints, composition.
Do NOT mention text overlays or copy in the FLUX prompt.

Respond ONLY as JSON: { "brandName": "", "businessDescription": "", "suggestedPrompt": "" }
`;

export async function extractBrandFromUrl(url: string): Promise<{
  brandName: string;
  businessDescription: string;
  suggestedPrompt: string;
  imageOptions: string[]; // stashed temp-uploads URLs, ready for use as references
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

  // Normalize bare domains (e.g. "www.paystack.com" → "https://www.paystack.com")
  const normalizedUrl = extractUrlFromMessage(url) ?? (url.startsWith("http") ? url : `https://${url}`);

  const scraped = await scrapeUrlFull(normalizedUrl);
  if (!scraped || !scraped.text) return null;

  let brandName = "";
  let businessDescription = "";
  let suggestedPrompt = "";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM },
        { role: "user", content: `Website content:\n\n${scraped.text}` },
      ],
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    brandName = parsed.brandName || "";
    businessDescription = parsed.businessDescription || "";
    suggestedPrompt = parsed.suggestedPrompt || "";
  } catch (e) {
    console.error("[extractBrandFromUrl] OpenAI extraction failed:", e);
    return null;
  }

  // Stash all image candidates to temp-uploads so the client gets stable Supabase URLs
  const imageOptions: string[] = [];
  await Promise.allSettled(
    scraped.imageOptions.map(async (imageUrl) => {
      try {
        const imageRes = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) });
        if (!imageRes.ok) return;
        const contentType = imageRes.headers.get("content-type") || "image/jpeg";
        if (!contentType.startsWith("image/")) return;
        const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
        const buffer = Buffer.from(await imageRes.arrayBuffer());
        const filePath = `${orgId}/og-images/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error } = await supabase.storage
          .from("temp-uploads")
          .upload(filePath, buffer, { contentType });

        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from("temp-uploads")
            .getPublicUrl(filePath);
          imageOptions.push(publicUrl);
        }
      } catch {
        // Image unreachable — skip silently
      }
    }),
  );

  return { brandName, businessDescription, suggestedPrompt, imageOptions };
}
