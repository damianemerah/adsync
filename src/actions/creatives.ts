"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/active-org";
import { getStoragePathFromUrl, getBucketFromUrl } from "@/lib/creative-utils";

/**
 * Uploads a file to Supabase storage with server-validated organization folder.
 * Prevents storage pollution attacks where users upload to other orgs' folders.
 */
export async function uploadCreativeFile(params: {
  file: File;
  bucket?: "creatives" | "temp-uploads";
}): Promise<{ publicUrl: string; filePath: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

  // Server-validated file path scoped to the authenticated org
  const bucket = params.bucket || "creatives";
  const fileExt = params.file.name.split(".").pop();
  const filePath = `${orgId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, params.file);

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return { publicUrl, filePath };
}

/**
 * Saves a new creative to the database with proper organization validation.
 * This prevents RLS bypass via client-side inserts.
 */
export async function saveCreative(params: {
  originalUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  format: string;
  generationParams?: any;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

  const mediaType = params.format.startsWith("video/") ? "video" : "image";

  // Insert the creative with server-validated organization_id
  const { data, error } = await supabase
    .from("creatives")
    .insert({
      organization_id: orgId,
      original_url: params.originalUrl,
      thumbnail_url: params.thumbnailUrl,
      width: params.width,
      height: params.height,
      media_type: mediaType,
      generation_context: params.generationParams,
    })
    .select()
    .single();

  if (error) throw error;

  return { success: true, creative: data };
}

/**
 * Deletes multiple creatives from the database and their corresponding files from Supabase storage.
 */
export async function deleteCreatives(ids: string[]) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

  // 1. Fetch the creatives to get their storage URLs
  const { data: creatives, error: fetchError } = await supabase
    .from("creatives")
    .select("id, original_url, thumbnail_url, organization_id")
    .in("id", ids)
    .eq("organization_id", orgId); // Extra security check

  if (fetchError) throw fetchError;
  if (!creatives || creatives.length === 0) return { success: true };

  // 2. Identify all file paths by bucket to delete from storage
  const bucketPaths: Record<string, string[]> = {};

  creatives.forEach((c) => {
    // Collect paths from both original and thumbnail URLs
    [c.original_url, c.thumbnail_url].forEach(url => {
      if (!url) return;
      const bucket = getBucketFromUrl(url);
      const path = getStoragePathFromUrl(url);

      // Security: Validate that the path belongs to this organization
      // Prevents deletion of other orgs' files if URL is tampered with
      if (bucket && path) {
        if (!path.startsWith(`${orgId}/`)) {
          console.warn(`[deleteCreatives] Skipping invalid path (wrong org): ${path}`);
          return;
        }
        if (!bucketPaths[bucket]) bucketPaths[bucket] = [];
        bucketPaths[bucket].push(path);
      }
    });
  });

  // 3. Delete files from Supabase storage (per bucket)
  const buckets = Object.keys(bucketPaths);
  for (const bucket of buckets) {
    const paths = bucketPaths[bucket];
    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove(paths);

      if (storageError) {
        console.error(`Failed to delete some files from bucket "${bucket}":`, storageError);
      }
    }
  }

  // 4. Delete rows from the database
  const { error: dbError } = await supabase
    .from("creatives")
    .delete()
    .in("id", creatives.map(c => c.id));

  if (dbError) throw dbError;

  return { success: true, count: creatives.length };
}
