"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client"; // Update path if needed
import { Database } from "@/types/supabase";

type CreativeInsert = Database["public"]["Tables"]["creatives"]["Insert"];

export function useCreatives() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  // 1. Fetch Creatives
  const query = useQuery({
    queryKey: ["creatives"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creatives")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // 2. Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      dimensions,
    }: {
      file: File;
      dimensions: { width: number; height: number };
    }) => {
      // A. Get User & Org
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: member } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!member) throw new Error("No organization found");

      // B. Upload to Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${member.organization_id}/${Math.random()
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

      // D. Insert into DB
      const creativeData: CreativeInsert = {
        organization_id: member.organization_id,
        name: file.name,
        media_type: file.type.startsWith("video") ? "video" : "image",
        original_url: publicUrl,
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
      queryClient.invalidateQueries({ queryKey: ["creatives"] });
    },
  });

  return {
    creatives: query.data || [],
    isLoading: query.isLoading,
    uploadCreative: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
  };
}
