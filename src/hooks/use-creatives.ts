"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client"; // Update path if needed
import { useActiveOrgContext } from "@/components/providers/active-org-provider";

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
      // A. Get User & Org
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let orgId = activeOrgId;

      if (!orgId) {
        const { data: member } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .limit(1);

        if (!member || member.length === 0)
          throw new Error("No organization found");
        orgId = member[0].organization_id as string;
      }

      // B. Upload to Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${orgId}/${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("creatives")
        .upload(fileName, file);

      console.log("Uploading file to storage:", fileName, uploadError);

      if (uploadError) throw uploadError;

      // C. Get Public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("creatives").getPublicUrl(fileName);

      // D. Optionally Upload Thumbnail
      let thumbnailUrl = null;
      if (thumbnailDataUrl) {
        try {
          const thumbRes = await fetch(thumbnailDataUrl);
          const thumbBlob = await thumbRes.blob();

          const thumbFileName = `${orgId}/${Math.random()
            .toString(36)
            .slice(2)}_thumb.jpg`;

          const { error: thumbUploadError } = await supabase.storage
            .from("creatives")
            .upload(thumbFileName, thumbBlob, { contentType: "image/jpeg" });

          if (!thumbUploadError) {
            const {
              data: { publicUrl: thumbPublicUrl },
            } = supabase.storage.from("creatives").getPublicUrl(thumbFileName);
            thumbnailUrl = thumbPublicUrl;
          }
        } catch (err) {
          console.error("Warning: Failed to upload thumbnail", err);
        }
      }

      // E. Insert into DB
      const creativeData = {
        organization_id: orgId,
        name: file.name,
        media_type: file.type.startsWith("video") ? "video" : "image",
        original_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        width: dimensions.width,
        height: dimensions.height,
        file_size_bytes: file.size,
        uploaded_by: user.id,
      };

      const { data, error: dbError } = await supabase
        .from("creatives")
        .insert(creativeData)
        .select()
        .single();

      if (dbError) throw dbError;

      return data;
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
