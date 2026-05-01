import { Suspense } from "react";

/**
 * Authenticated route group layout.
 *
 * This layout's ONLY job is to provide a <Suspense> boundary so that every
 * child layout ((main)/layout.tsx, onboarding/layout.tsx, etc.) can safely
 * access dynamic data — cookies(), headers(), and uncached fetch calls like
 * supabase.auth.getUser() — without triggering the Next.js 16 error:
 *   "Uncached data was accessed outside of <Suspense>"
 *
 * Rules:
 * - Do NOT add createClient(), cookies(), or any async data access here.
 *   This component is synchronous by design so it renders immediately and
 *   provides the Suspense boundary for all children.
 * - The <Suspense> here is intentionally fallback-free (null). Auth checks
 *   in child layouts are fast (cookie + single DB query); there is no
 *   meaningful loading state to show at this level.
 */
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense>{children}</Suspense>;
}
