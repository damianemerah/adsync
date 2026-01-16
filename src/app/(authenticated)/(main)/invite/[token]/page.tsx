"use client";

import { use } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Users, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  // Mock data - in real app, fetch based on token
  const invitation = {
    inviter: {
      name: "Ahmed Hassan",
      email: "ahmed@example.com",
      avatar: "/professional-headshot.png",
    },
    organization: {
      name: "Lagos Slay Queens",
      industry: "E-commerce",
      memberCount: 12,
    },
    role: "Campaign Manager",
  };

  const handleAccept = () => {
    // Handle accept logic
    console.log("[v0] Accepting invitation with token:", token);
    window.location.href = "/dashboard";
  };

  const handleDecline = () => {
    // Handle decline logic
    console.log("[v0] Declining invitation with token:", token);
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-blue-50/20 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl rounded-2xl p-8 bg-white/80 backdrop-blur">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            You've been invited!
          </h1>
        </div>

        {/* Inviter Info */}
        <div className="flex items-center gap-4 py-6 border-b border-slate-200 mt-6">
          <Avatar className="w-12 h-12">
            <AvatarImage
              src={invitation.inviter.avatar || "/placeholder.svg"}
              alt={invitation.inviter.name}
            />
            <AvatarFallback>
              {invitation.inviter.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">
                {invitation.inviter.name}
              </span>{" "}
              invited you to join
            </p>
            <p className="text-xs text-slate-500">{invitation.inviter.email}</p>
          </div>
        </div>

        {/* Organization Info */}
        <div className="py-6 space-y-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-linear-to-br from-blue-500 to-purple-600 mb-4">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {invitation.organization.name}
            </h2>
            <p className="text-slate-600">{invitation.organization.industry}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="text-center p-4 rounded-lg bg-slate-50">
              <div className="text-2xl font-bold text-slate-900">
                {invitation.organization.memberCount}
              </div>
              <div className="text-sm text-slate-600">Team Members</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50">
              <div className="text-lg font-semibold text-slate-900">
                {invitation.role}
              </div>
              <div className="text-sm text-slate-600">Your Role</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-6 border-t border-slate-200">
          <Button onClick={handleAccept} className="w-full h-12">
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Accept Invitation
          </Button>
          <Button
            onClick={handleDecline}
            variant="ghost"
            className="w-full h-12"
          >
            <XCircle className="w-5 h-5 mr-2" />
            Decline
          </Button>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-center text-slate-500 mt-6">
          By accepting, you'll get access to campaigns, analytics, and team
          collaboration tools.
        </p>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-slate-500">
        <p>
          Having issues?{" "}
          <Link href="/support" className="text-blue-600 hover:underline">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}
