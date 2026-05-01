/**
 * active-org.ts
 *
 * Server-side utility to resolve the user's active organization from the
 * `Tenzu_active_org` cookie. Used by Server Components, layouts, and
 * server actions to avoid always defaulting to the first organization.
 */

import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const ACTIVE_ORG_COOKIE = "Tenzu_active_org";

/**
 * Returns the active organization ID from the cookie, OR falls back to the
 * user's first (oldest) organization if the cookie is missing or stale.
 *
 * Wrapped in React.cache() to deduplicate within a single server render
 * (e.g. when called from both layout and page in the same request).
 */
export const getActiveOrgId = cache(async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch all orgs this user belongs to (ordered by join date)
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });

  if (!memberships || memberships.length === 0) return null;

  const orgIds = memberships
    .map((m) => m.organization_id)
    .filter(Boolean) as string[];

  // Validate the cookie value is one the user actually belongs to
  if (fromCookie && orgIds.includes(fromCookie)) {
    return fromCookie;
  }

  // Fallback: first org

  return orgIds[0];
});

/**
 * Returns ALL organization IDs the user is a member of.
 */
export const getUserOrgIds = cache(async (): Promise<string[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });

  return (memberships?.map((m) => m.organization_id).filter(Boolean) ??
    []) as string[];
});
