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

/**
 * Extracts the storage path (excluding bucket name) from a Supabase public URL.
 * Example: https://.../storage/v1/object/public/creatives/org_id/file.png
 * returns "org_id/file.png"
 */
export function getStoragePathFromUrl(url: string): string | null {
  if (!url) return null;
  const parts = url.split("/object/public/");
  if (parts.length < 2) return null;
  const pathWithBucket = parts[1];
  const bucketEndIndex = pathWithBucket.indexOf("/");
  if (bucketEndIndex === -1) return null;
  return pathWithBucket.substring(bucketEndIndex + 1);
}

/**
 * Extracts the storage bucket name from a Supabase public URL.
 * Example: https://.../storage/v1/object/public/creatives/org_id/file.png
 * returns "creatives"
 */
export function getBucketFromUrl(url: string): string | null {
  if (!url) return null;
  const parts = url.split("/object/public/");
  if (parts.length < 2) return null;
  const pathWithBucket = parts[1];
  const bucketEndIndex = pathWithBucket.indexOf("/");
  if (bucketEndIndex === -1) return null;
  return pathWithBucket.substring(0, bucketEndIndex);
}
