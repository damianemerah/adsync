"use client";

import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Group, Mail, SystemRestart, Trash, Clock } from "iconoir-react";
import { toast } from "sonner";
import {
  inviteTeamMember,
  revokeInvitation,
  removeMember,
} from "@/actions/team";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchTeamData(orgId: string) {
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TeamSettingsPage() {
  const { activeOrgId } = useActiveOrgContext();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("members");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");

  // ─── Data Fetching ────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["team", activeOrgId],
    queryFn: () => fetchTeamData(activeOrgId!),
    enabled: !!activeOrgId,
    staleTime: 60 * 1000,
  });

  const members = data?.members ?? [];
  const invites = data?.invites ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["team", activeOrgId] });

  // ─── Mutations ────────────────────────────────────────────────────────────
  const inviteMutation = useMutation({
    mutationFn: () => inviteTeamMember(email, role),
    onSuccess: () => {
      toast.success("Invitation Sent!");
      setIsInviteOpen(false);
      setEmail("");
      invalidate();
    },
    onError: (e: Error) => toast.error("Failed to invite", { description: e.message }),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeInvitation(id),
    onSuccess: () => { toast.success("Invitation revoked"); invalidate(); },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeMember(userId),
    onSuccess: () => { toast.success("Member removed"); invalidate(); },
  });

  return (
    <div className="space-y-6">
      {/* Header + Invite Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading text-foreground">
            Members
          </h2>
          <p className="text-sm text-subtle-foreground">
            Manage team members and pending invitations.
          </p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)} className="font-bold">
          <Group className="w-4 h-4 mr-2" /> Invite Members
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b border-border h-auto p-0 bg-transparent rounded-none">
          <TabsTrigger
            value="members"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground px-4 py-2.5 text-subtle-foreground"
          >
            Active Members ({members.length})
          </TabsTrigger>
          <TabsTrigger
            value="invites"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground px-4 py-2.5 text-subtle-foreground"
          >
            Pending Invites ({invites.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <Card>
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3 border-b border-border bg-muted/50 rounded-t-2xl">
              <p className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider">
                Name
              </p>
              <p className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider w-24 text-center">
                Role
              </p>
              <p className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider w-16 text-right">
                Action
              </p>
            </div>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-subtle-foreground flex items-center justify-center gap-2">
                  <SystemRestart className="h-4 w-4 animate-spin" /> Loading members...
                </div>
              ) : members.length === 0 ? (
                <div className="p-8 text-center text-subtle-foreground">
                  No members yet.
                </div>
              ) : (
                members.map((member: any) => (
                  <div
                    key={member.id}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarImage src={member.users?.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {member.users?.email?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {member.users?.full_name || "User"}
                        </p>
                        <p className="text-xs text-subtle-foreground">
                          {member.users?.email}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="capitalize w-24 justify-center"
                    >
                      {member.role}
                    </Badge>
                    <div className="w-16 flex justify-end">
                      {member.role !== "owner" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Are you sure you want to remove this user?")) {
                              removeMutation.mutate(member.user_id);
                            }
                          }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      ) : (
                        <span className="text-xs text-subtle-foreground">—</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invites" className="mt-4">
          <Card>
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3 border-b border-border bg-muted/50 rounded-t-2xl">
              <p className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider">
                Email
              </p>
              <p className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider w-24 text-center">
                Role
              </p>
              <p className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider w-20 text-right">
                Action
              </p>
            </div>
            <CardContent className="p-0">
              {invites.length === 0 ? (
                <div className="p-8 text-center text-subtle-foreground">
                  No pending invites.
                </div>
              ) : (
                invites.map((invite: any) => (
                  <div
                    key={invite.id}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {invite.email}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-subtle-foreground">
                          <Clock className="w-3 h-3" /> Sent{" "}
                          {new Date(invite.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="capitalize w-24 justify-center"
                    >
                      {invite.role}
                    </Badge>
                    <div className="w-20 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeMutation.mutate(invite.id)}
                        disabled={revokeMutation.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Modal */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Members</DialogTitle>
            <DialogDescription>
              Enter the member&apos;s email and assign their role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                placeholder="someone@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">
                    Editor (Can create ads)
                  </SelectItem>
                  <SelectItem value="viewer">Viewer (Read only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending || !email}
            >
              {inviteMutation.isPending ? (
                <SystemRestart className="w-4 h-4 animate-spin" />
              ) : (
                "Invite"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
