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
      if (!activeOrgId) return [];

      // 1. Fetch root creatives (no parent) with their selected variant URL
      const { data: roots, error } = await supabase
        .from("creatives")
        .select("*, selected_variant:creatives!selected_variant_id(id, original_url)")
        .eq("organization_id", activeOrgId)
        .is("parent_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!roots || roots.length === 0) return [];

      // 2. Fetch variant counts for all roots in a single query
      const rootIds = roots.map((r) => r.id);
      const { data: variantRows } = await supabase
        .from("creatives")
        .select("parent_id")
        .in("parent_id", rootIds)
        .eq("organization_id", activeOrgId);

      const countMap: Record<string, number> = {};
      for (const v of variantRows ?? []) {
        if (v.parent_id)
          countMap[v.parent_id] = (countMap[v.parent_id] ?? 0) + 1;
      }

      // 3. Enrich each root with a resolved display URL and variant count
      return roots.map((c) => ({
        ...c,
        displayUrl:
          (c.selected_variant as { original_url: string } | null)
            ?.original_url ?? c.original_url,
        variantCount: countMap[c.id] ?? 0,
      }));
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
