import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { inviteTeamMember, revokeInvitation, removeMember } from "@/actions/team";
import { toast } from "sonner";

export async function fetchTeamData(orgId: string) {
  const supabase = createClient();
  const [{ data: membersData }, { data: invitesData }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("id, role, user_id, joined_at, users(email, full_name, avatar_url)")
      .eq("organization_id", orgId),
    supabase
      .from("invitations")
      .select("*")
      .eq("organization_id", orgId),
  ]);
  return {
    members: membersData ?? [],
    invites: invitesData ?? [],
  };
}

export function useTeamList(orgId: string | null) {
  return useQuery({
    queryKey: ["team", orgId],
    queryFn: () => fetchTeamData(orgId!),
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });
}

export function useTeamMutations(orgId: string | null) {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["team", orgId] });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: "editor" | "viewer" }) =>
      inviteTeamMember(email, role),
    onSuccess: () => {
      toast.success("Invitation Sent!");
      invalidate();
    },
    onError: (e: Error) => toast.error("Failed to invite", { description: e.message }),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeInvitation(id),
    onSuccess: () => {
      toast.success("Invitation revoked");
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeMember(userId),
    onSuccess: () => {
      toast.success("Member removed");
      invalidate();
    },
  });

  return { inviteMutation, revokeMutation, removeMutation };
}
