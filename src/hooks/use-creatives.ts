"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";
import { getCreativeHistory } from "@/actions/ai-images";

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ---------------------------------------------------------------------------
// Query Hook — subscribe to this if you only need to READ creatives
// ---------------------------------------------------------------------------

export function useCreativesList() {
  const supabase = createClient();
  const { activeOrgId } = useActiveOrgContext();

  return useQuery({
    queryKey: ["creatives", activeOrgId],
    queryFn: async () => {
      let query = supabase
        .from("creatives")
        .select("*")
        .order("created_at", { ascending: false });

      if (activeOrgId) {
        query = query.eq("organization_id", activeOrgId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation Hook — subscribe to this if you only need to WRITE creatives.
// No useQuery inside — components using this will NOT re-render on list changes.
// ---------------------------------------------------------------------------

export function useCreativeMutations() {
  const queryClient = useQueryClient();
  const { activeOrgId } = useActiveOrgContext();

  // 1. Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      dimensions,
      thumbnailDataUrl,
    }: {
      file: File;
      dimensions: { width: number; height: number };
      thumbnailDataUrl?: string;
    }) => {
      const { uploadCreativeFile } = await import("@/actions/creatives");
      const { publicUrl } = await uploadCreativeFile({
        file,
        bucket: "creatives",
      });

      let thumbnailUrl = null;
      if (thumbnailDataUrl) {
        try {
          const thumbBlob = dataUrlToBlob(thumbnailDataUrl);
          const thumbFile = new File([thumbBlob], "thumbnail.jpg", {
            type: "image/jpeg",
          });

          const { publicUrl: thumbPublicUrl } = await uploadCreativeFile({
            file: thumbFile,
            bucket: "creatives",
          });
          thumbnailUrl = thumbPublicUrl;
        } catch (err) {
          console.error("Warning: Failed to upload thumbnail", err);
        }
      }

      const { saveCreative } = await import("@/actions/creatives");

      const result = await saveCreative({
        name: file.name,
        originalUrl: publicUrl,
        thumbnailUrl: thumbnailUrl ?? undefined,
        width: dimensions.width,
        height: dimensions.height,
        format: file.type,
      });

      if (!result.success) throw new Error("Failed to save creative");
      console.log("✅ Creative saved:", result.creative);

      return result.creative;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creatives", activeOrgId] });
    },
  });

  // 2. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { deleteCreatives } = await import("@/actions/creatives");
      return deleteCreatives(ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creatives", activeOrgId] });
    },
  });

  return {
    uploadCreative: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    deleteCreatives: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}


// ---------------------------------------------------------------------------
// Creative History Query — pure query, no mutations
// ---------------------------------------------------------------------------

export function useCreativeHistory(creativeId: string | null) {
  const { activeOrgId } = useActiveOrgContext();
  const query = useQuery({
    queryKey: ["creative-history", creativeId, activeOrgId],
    queryFn: async () => {
      if (!creativeId) return null;
      console.log("🪝 useCreativeHistory: Fetching for", creativeId);
      return getCreativeHistory(creativeId);
    },
    enabled: !!creativeId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
