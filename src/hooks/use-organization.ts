"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface Organization {
  id: string;
  name: string;
  industry: string | null;
  selling_method: string | null;
  price_tier: string | null;
  customer_gender: string | null;
  subscription_tier: string | null;
}

export function useOrganization() {
  const supabase = createClient();

  const query = useQuery({
    queryKey: ["organization"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      // Get the org where the user is a member (assuming single org for now)
      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (memberData && memberData.organization_id) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select(
            "id, name, industry, selling_method, price_tier, customer_gender, subscription_tier",
          )
          .eq("id", memberData.organization_id)
          .single();

        return orgData as Organization;
      }

      return null;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    organization: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
