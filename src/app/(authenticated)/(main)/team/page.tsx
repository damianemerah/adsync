"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus,
  Trash2,
  Mail,
  ShieldAlert,
  CheckCircle2,
  Clock,
  MoreVertical,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Column, DataTable } from "@/components/ui/data-table";

interface Member {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: "owner" | "editor" | "viewer";
  joinedDate: string;
  status: "active";
}

interface Invite {
  id: string;
  email: string;
  role: "editor" | "viewer";
  sentDate: string;
  status: "pending";
}

// --- MOCK DATA ---
const activeMembers: Member[] = [
  {
    id: "1",
    name: "Adeola Oluwaseun",
    email: "adeola@store.com",
    avatar: "https://github.com/shadcn.png",
    role: "owner",
    joinedDate: "Jan 15, 2024",
    status: "active",
  },
  {
    id: "2",
    name: "Chioma Nwosu",
    email: "chioma@agency.com",
    avatar: null, // No avatar
    role: "editor",
    joinedDate: "Feb 3, 2024",
    status: "active",
  },
];

const pendingInvites: Invite[] = [
  {
    id: "inv_1",
    email: "marketer@gmail.com",
    role: "editor",
    sentDate: "2 days ago",
    status: "pending",
  },
];

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState("members");
  const [members, setMembers] = useState(activeMembers);
  const [invites, setInvites] = useState(pendingInvites);

  // Invite Modal State
  const [openInvite, setOpenInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");

  const memberColumns: Column<Member>[] = [
    {
      key: "user",
      title: "User",
      render: (member) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={member.avatar || ""} />
            <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
              {member.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-slate-900">{member.name}</p>
            <p className="text-xs text-slate-500">{member.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      title: "Role",
      render: (member) => <RoleBadge role={member.role} />,
    },
    {
      key: "joinedDate",
      title: "Joined",
      className: "text-slate-500 font-medium text-sm",
    },
    {
      key: "actions",
      title: "Actions",

      render: (member) =>
        member.role !== "owner" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Change Role</DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => handleRemoveMember(member.id)}
              >
                Remove User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null,
    },
  ];

  const inviteColumns: Column<Invite>[] = [
    {
      key: "email",
      title: "Email",
      className: "font-medium text-slate-900",
    },
    {
      key: "role",
      title: "Role",
      render: (invite) => <RoleBadge role={invite.role} />,
    },
    {
      key: "status",
      title: "Status",
      render: () => (
        <Badge
          variant="outline"
          className="text-orange-600 border-orange-200 bg-orange-50 gap-1"
        >
          <Clock className="h-3 w-3" /> Pending
        </Badge>
      ),
    },
    {
      key: "actions",
      title: "Actions",

      render: (invite) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => handleCancelInvite(invite.id)}
        >
          Revoke
        </Button>
      ),
    },
  ];

  const handleSendInvite = () => {
    // Simulate API Call
    setInvites([
      ...invites,
      {
        id: `inv_${Date.now()}`,
        email: inviteEmail,
        role: inviteRole,
        sentDate: "Just now",
        status: "pending",
      },
    ]);
    setOpenInvite(false);
    setInviteEmail("");
  };

  const handleRemoveMember = (id: string) => {
    setMembers(members.filter((m) => m.id !== id));
  };

  const handleCancelInvite = (id: string) => {
    setInvites(invites.filter((i) => i.id !== id));
  };

  return (
    <div>
      <div>
        <main className="flex-1 p-8 max-w-5xl mx-auto w-full space-y-8">
          {/* 1. Stats Overview */}
          <div className="grid grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Members
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {members.length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Pending Invites
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {invites.length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 text-white border-slate-800">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-400">Plan Limit</p>
                <div className="flex justify-between items-end">
                  <p className="text-2xl font-bold text-white">
                    {members.length + invites.length} / 5
                  </p>
                  <Badge
                    variant="outline"
                    className="text-blue-400 border-blue-400/30"
                  >
                    Growth Plan
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 2. Main List Area */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-12 w-fit">
              <TabsTrigger
                value="members"
                className="h-10 px-6 rounded-lg data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900"
              >
                Active Members
              </TabsTrigger>
              <TabsTrigger
                value="invites"
                className="h-10 px-6 rounded-lg data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900"
              >
                Pending Invites{" "}
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 px-1.5 bg-orange-100 text-orange-700"
                >
                  {invites.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members">
              <DataTable columns={memberColumns} data={members} />
            </TabsContent>

            <TabsContent value="invites">
              <DataTable
                columns={inviteColumns}
                data={invites}
                emptyState={
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <Mail className="w-12 h-12 mb-4" />
                    <p className="text-xl font-medium">No pending invites</p>
                    <p className="text-sm">
                      All invites have been accepted or revoked.
                    </p>
                  </div>
                }
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Invite Dialog */}
      <Dialog open={openInvite} onOpenChange={setOpenInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              They will receive an email to join your organization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(value) =>
                  setInviteRole(value as "editor" | "viewer")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">
                    <div className="flex flex-col items-start py-1">
                      <span className="font-bold">Editor</span>
                      <span className="text-xs text-slate-500">
                        Can manage campaigns, creatives, and ads.
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex flex-col items-start py-1">
                      <span className="font-bold">Viewer</span>
                      <span className="text-xs text-slate-500">
                        Can view reports but cannot edit anything.
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenInvite(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendInvite}
              disabled={!inviteEmail}
              className="bg-blue-600"
            >
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "owner") {
    return (
      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0">
        Owner
      </Badge>
    );
  }
  if (role === "editor") {
    return (
      <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200">
        Editor
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-slate-600">
      Viewer
    </Badge>
  );
}
