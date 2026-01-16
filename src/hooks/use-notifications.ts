"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/supabase";

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export function useNotifications() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // 1. Fetch
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // 2. Mark All Read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false); // Only update unread ones
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // 3. Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    notifications: query.data || [],
    isLoading: query.isLoading,
    markAllRead: markAllReadMutation.mutate,
    deleteNotification: deleteMutation.mutate,
  };
}
