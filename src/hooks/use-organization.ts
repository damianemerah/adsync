"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { setActiveOrganization } from "@/actions/organization";
import { useRouter } from "next/navigation";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";

export interface Organization {
  id: string;
  name: string;
  industry: string | null;
  selling_method: string | null;
  price_tier: string | null;
  customer_gender: string | null;
  subscription_tier: string | null;
  business_description?: string | null;
  whatsapp_number?: string | null;
  business_website?: string | null;
  city?: string | null;
  state?: string | null;
  pixel_token?: string | null;
  logo_url?: string | null;
  default_target_locations?: Array<{ id: string; name: string; type: string; country_code: string }> | null;
  default_target_interests?: Array<{ id: string; name: string }> | null;
}

interface UseOrganizationResult {
  /** The currently active organization (matched by cookie). */
  organization: Organization | null;
  /** All organizations the user is a member of. */
  organizations: Organization[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  /** Switch to a different organization workspace. */
  switchOrganization: (orgId: string) => Promise<void>;
  isSwitching: boolean;
}

export function useOrganization(
  activeOrgIdProp?: string | null,
): UseOrganizationResult {
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId: contextOrgId } = useActiveOrgContext();

  const effectiveActiveOrgId = activeOrgIdProp ?? contextOrgId;

  const query = useQuery({
    queryKey: ["organizations"],
    queryFn: async (): Promise<Organization[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      // Fetch all orgs the user belongs to
      const { data: memberships } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: true });

      if (!memberships || memberships.length === 0) return [];

      const orgIds = memberships
        .map((m) => m.organization_id)
        .filter(Boolean) as string[];

      const { data: orgs } = await supabase
        .from("organizations")
        .select(
          "id, name, industry, selling_method, price_tier, customer_gender, subscription_tier, business_description, whatsapp_number, business_website, city, state, pixel_token, logo_url, default_target_locations, default_target_interests",
        )
        .in("id", orgIds);

      if (!orgs) return [];

      // Return orgs in membership order
      return orgIds
        .map((id) => orgs.find((o) => o.id === id))
        .filter(Boolean) as Organization[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const organizations = query.data ?? [];

  // Determine the active org: prefer the effectively provided activeOrgId,
  // fallback to first org in the list.
  const organization =
    (effectiveActiveOrgId
      ? organizations.find((o) => o.id === effectiveActiveOrgId)
      : undefined) ??
    organizations[0] ??
    null;

  const switchMutation = useMutation({
    mutationFn: async (orgId: string) => {
      await setActiveOrganization(orgId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      router.refresh();
    },
  });

  return {
    organization,
    organizations,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    switchOrganization: switchMutation.mutateAsync,
    isSwitching: switchMutation.isPending,
  };
}
