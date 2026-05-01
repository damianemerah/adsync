// Matches explicit https?:// URLs
const EXPLICIT_URL_REGEX = /https?:\/\/[^\s"'<>()[\]{}]+/i;

// Matches bare domains with African ccTLDs, global TLDs, and modern TLDs
// African ccTLDs: .ng, .za, .gh, .ke, .eg, .tz, .ug, .rw, .sn, .ci, .cm, .et, .ma, .tn, .dz, .zw, .zm, .bw, .mz, .ao
// Global / modern: .com, .net, .org, .io, .ai, .app, .co, .store, .shop, .dev, .tech, .online, .site, .web, .info, .biz
const BARE_DOMAIN_REGEX =
  /\b(?:www\.)?[\w-]+\.(?:com|net|org|io|ai|app|co|store|shop|dev|tech|online|site|web|info|biz|ng|za|gh|ke|eg|tz|ug|rw|sn|ci|cm|et|ma|tn|dz|zw|zm|bw|mz|ao)(?:\/[^\s"'<>()[\]{}]*)?\b/i;

/** Extract the first URL from a message string, or null if none.
 *  Handles explicit https?:// URLs and bare domains (with or without www). */
export function extractUrlFromMessage(text: string): string | null {
  // 1. Try explicit protocol first
  const explicitMatch = text.match(EXPLICIT_URL_REGEX);
  if (explicitMatch) {
    return explicitMatch[0].replace(/[.,;:!?]+$/, "");
  }

  // 2. Fall back to bare domain, then normalise to https://
  const bareMatch = text.match(BARE_DOMAIN_REGEX);
  if (bareMatch) {
    const raw = bareMatch[0].replace(/[.,;:!?]+$/, "");
    return raw.startsWith("http") ? raw : `https://${raw}`;
  }

  return null;
}

/** Returns true if the text contains a URL (explicit or bare domain). */
export function messageContainsUrl(text: string): boolean {
  return EXPLICIT_URL_REGEX.test(text) || BARE_DOMAIN_REGEX.test(text);
}

/**
 * Fetch a URL server-side and return text content plus ranked image candidates.
 * imageOptions: og:image first (most reliable), then prominent <img> tags.
 * Returns null on any fetch/parse failure.
 */
export async function scrapeUrlFull(url: string): Promise<{
  text: string | null;
  imageOptions: string[];
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TenzuBot/1.0; +https://tenzu.ai)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.log(`[scrapeUrlFull] HTTP ${res.status} ${res.statusText} for ${url}`);
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      console.log(`[scrapeUrlFull] Non-HTML content-type "${contentType}" for ${url}`);
      return null;
    }

    const html = await res.text();
    const ogImage = extractOgImageFromHtml(html);
    const imgTags = extractImagesFromHtml(html, url);

    // og:image first, then deduplicated img tags (skip duplicates of og:image)
    const imageOptions = [
      ...(ogImage ? [ogImage] : []),
      ...imgTags.filter((u) => u !== ogImage),
    ].slice(0, 4);

    return { text: extractTextFromHtml(html), imageOptions };
  } catch (e) {
    console.log(`[scrapeUrlFull] Fetch error for ${url}:`, e);
    return null;
  }
}

/**
 * Fetch a URL server-side and extract meaningful text content.
 * Returns null on any failure — the chat should always degrade gracefully.
 * Caps output at 2,000 chars to stay within token budget.
 */
export async function scrapeUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TenzuBot/1.0; +https://tenzu.ai)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.log(`[scrapeUrl] HTTP ${res.status} ${res.statusText} for ${url}`);
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      console.log(`[scrapeUrl] Non-HTML content-type "${contentType}" for ${url}`);
      return null;
    }

    const html = await res.text();
    const result = extractTextFromHtml(html);
    if (!result) {
      console.log(`[scrapeUrl] extractTextFromHtml returned null for ${url}`);
    }
    return result;
  } catch (e){
    console.log(`[scrapeUrl] Fetch error for ${url}:`, e)
    return null;
  }
}

function extractOgImageFromHtml(html: string): string | null {
  const match =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return match ? match[1].trim() : null;
}

function extractImagesFromHtml(html: string, baseUrl: string): string[] {
  const results: string[] = [];
  const imgPattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = imgPattern.exec(html)) !== null) {
    const src = match[1].trim();
    if (!src || src.startsWith("data:")) continue;

    let abs: string;
    try {
      abs = new URL(src, baseUrl).href;
    } catch {
      continue;
    }

    if (!abs.startsWith("http")) continue;
    const lower = abs.toLowerCase();
    // Only raster image formats likely to be product photos
    if (!/\.(jpe?g|png|webp|avif)(\?|$|#)/.test(lower)) continue;
    // Skip tracking pixels, favicons, icons
    if (/favicon|\.ico|1x1|pixel|tracking|beacon|spacer/.test(lower)) continue;

    results.push(abs);
    if (results.length >= 6) break;
  }

  return [...new Set(results)];
}

function extractTextFromHtml(html: string): string | null {
  // Remove scripts, styles, nav, footer, header blocks entirely
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  // Extract title
  const titleMatch = cleaned.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch
    ? titleMatch[1].replace(/&amp;/g, "&").replace(/&#\d+;/g, "").trim()
    : "";

  // Extract meta description
  const metaMatch = cleaned.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  ) || cleaned.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
  );
  const metaDesc = metaMatch ? metaMatch[1].trim() : "";

  // Extract text from semantic content tags
  const contentParts: string[] = [];

  const tagPattern = /<(h1|h2|h3|h4|p|li|span|div|section|article|main)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = tagPattern.exec(cleaned)) !== null) {
    const text = match[2]
      .replace(/<[^>]+>/g, " ")   // strip inner tags
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#\d+;/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length > 20 && text.length < 500) {
      contentParts.push(text);
    }
  }

  // Deduplicate and join
  const seen = new Set<string>();
  const unique = contentParts.filter((t) => {
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });

  const parts: string[] = [];
  if (title) parts.push(`Title: ${title}`);
  if (metaDesc) parts.push(`Description: ${metaDesc}`);
  if (unique.length > 0) parts.push(unique.slice(0, 30).join(" | "));

  const result = parts.join("\n").substring(0, 2000).trim();
  return result.length > 50 ? result : null;
}
