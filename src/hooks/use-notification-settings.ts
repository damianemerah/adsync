"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotificationSettings,
  updateNotificationSettings,
  startWhatsAppVerification,
  confirmWhatsAppVerification,
  disconnectWhatsApp,
} from "@/actions/notifications";
import { toast } from "sonner";

export function useNotificationSettings() {
  const query = useQuery({
    queryKey: ["notification-settings"],
    queryFn: async () => getNotificationSettings(),
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateNotificationSettings,
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: ["notification-settings"] });
      const previousSettings = queryClient.getQueryData([
        "notification-settings",
      ]);
      queryClient.setQueryData(["notification-settings"], (old: any) => ({
        ...old,
        ...newSettings,
      }));
      return { previousSettings };
    },
    onError: (err, newSettings, context) => {
      queryClient.setQueryData(
        ["notification-settings"],
        context?.previousSettings,
      );
      toast.error("Failed to update settings");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
    },
  });
}

export function useWhatsAppVerification() {
  const queryClient = useQueryClient();

  const startVerification = useMutation({
    mutationFn: startWhatsAppVerification,
    onError: (error) => {
      toast.error(error.message || "Failed to send OTP");
    },
  });

  const confirmVerification = useMutation({
    mutationFn: confirmWhatsAppVerification,
    onSuccess: () => {
      toast.success("WhatsApp connected successfully");
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to verify OTP");
    },
  });

  const disconnect = useMutation({
    mutationFn: disconnectWhatsApp,
    onSuccess: () => {
      toast.success("WhatsApp disconnected");
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
    },
    onError: (error) => {
      toast.error("Failed to disconnect WhatsApp");
    },
  });

  return {
    startVerification,
    confirmVerification,
    disconnect,
  };
}
