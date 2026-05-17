"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";
import type { Database } from "@/types/supabase";

export type CreativeTemplate = Database["public"]["Tables"]["creative_templates"]["Row"];

export interface TemplateVariableDef {
  key: string;
  label?: string;
  type?: "text" | "select" | "color";
  placeholder?: string;
  options?: string[];
  default?: string;
  required?: boolean;
}

export function useCreativeTemplates() {
  const supabase = createClient();
  const { activeOrgId } = useActiveOrgContext();

  return useQuery({
    queryKey: ["creative-templates", activeOrgId],
    queryFn: async (): Promise<CreativeTemplate[]> => {
      const { data, error } = await supabase
        .from("creative_templates")
        .select("*")
        .order("category", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 30,
  });
}
