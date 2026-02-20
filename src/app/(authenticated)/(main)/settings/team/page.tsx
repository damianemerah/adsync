"use client";

import { useState, useEffect } from "react";
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
import { createClient } from "@/lib/supabase/client";

export default function TeamSettingsPage() {
  const [activeTab, setActiveTab] = useState("members");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");

  // Data State
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Data (Client Side for simplicity, ideally useQuery)
  const fetchData = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get Org
    const { data: memberData } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();
    if (!memberData) return;

    const orgId = memberData.organization_id;
    if (!orgId) return;

    // Get Members
    const { data: membersData } = await supabase
      .from("organization_members")
      .select(
        "id, role, user_id, joined_at, users(email, full_name, avatar_url)",
      )
      .eq("organization_id", orgId);

    // Get Invites
    const { data: invitesData } = await supabase
      .from("invitations")
      .select("*")
      .eq("organization_id", orgId);

    setMembers(membersData || []);
    setInvites(invitesData || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInvite = async () => {
    setIsInviting(true);
    try {
      await inviteTeamMember(email, role);
      toast.success("Invitation Sent!");
      setIsInviteOpen(false);
      setEmail("");
      fetchData(); // Refresh list
    } catch (e: any) {
      toast.error("Failed to invite", { description: e.message });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    await revokeInvitation(id);
    toast.success("Invitation revoked");
    fetchData();
  };

  const handleRemove = async (userId: string) => {
    if (confirm("Are you sure you want to remove this user?")) {
      await removeMember(userId);
      toast.success("Member removed");
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-50 border-dashed border-slate-300 shadow-none">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-700">Grow your team</h3>
            <p className="text-sm text-slate-500">
              Invite colleagues to help manage campaigns.
            </p>
          </div>
          <Button
            onClick={() => setIsInviteOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 font-bold"
          >
            <Group className="w-4 h-4 mr-2" /> Invite Member
          </Button>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b border-slate-200 h-auto p-0 bg-transparent rounded-none">
          <TabsTrigger
            value="members"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 px-4 py-2"
          >
            Active Members ({members.length})
          </TabsTrigger>
          <TabsTrigger
            value="invites"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 px-4 py-2"
          >
            Pending Invites ({invites.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.users?.avatar_url} />
                      <AvatarFallback>
                        {member.users?.email?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-sm text-slate-900">
                        {member.users?.full_name || "User"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {member.users?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="capitalize">
                      {member.role}
                    </Badge>
                    {member.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(member.user_id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invites" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {invites.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  No pending invites.
                </div>
              )}
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">
                        {invite.email}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3 h-3" /> Sent{" "}
                        {new Date(invite.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="capitalize">
                      {invite.role}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(invite.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Modal */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                placeholder="colleague@company.com"
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
              onClick={handleInvite}
              disabled={isInviting || !email}
              className="bg-blue-600"
            >
              {isInviting ? (
                <SystemRestart className="w-4 h-4 animate-spin" />
              ) : (
                "Send Invite"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
