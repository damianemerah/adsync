"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client"; // Update path if needed
import { useActiveOrgContext } from "@/components/providers/active-org-provider";

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function useCreatives() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { activeOrgId } = useActiveOrgContext();

  // 1. Fetch Creatives
  const query = useQuery({
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

  // 2. Upload Mutation
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
      // A. Upload to Storage using server action (prevents org folder pollution)
      const { uploadCreativeFile } = await import("@/actions/creatives");
      const { publicUrl } = await uploadCreativeFile({
        file,
        bucket: "creatives",
      });

      // B. Optionally Upload Thumbnail
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

      // E. Insert into DB using server action (prevents RLS bypass)
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

  // 3. Delete Mutation
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
    creatives: query.data || [],
    isLoading: query.isLoading,
    uploadCreative: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    deleteCreatives: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

// [NEW] Hook for Creative History
import { getCreativeHistory } from "@/actions/ai-images";

export function useCreativeHistory(creativeId: string | null) {
  const query = useQuery({
    queryKey: ["creative-history", creativeId],
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
