/**
 * Pure URL helpers for classifying Supabase Storage URLs.
 * Kept in a plain (non-server) module so they can be imported
 * by both client components and server actions without triggering
 * Next.js's "Server Actions must be async" rule.
 */

/**
 * Returns true when the URL already points to the permanent `creatives` bucket.
 * Used to short-circuit saveCreativeToLibrary when the image was already saved.
 */
export function isPermanentCreativeUrl(url: string): boolean {
  return url.includes("/object/public/creatives/");
}

/**
 * Returns true when the URL points to the temp-uploads bucket (chat-stashed
 * or user-uploaded reference images). These are ephemeral and can be promoted.
 */
export function isTempUploadUrl(url: string): boolean {
  return url.includes("/object/public/temp-uploads/");
}
