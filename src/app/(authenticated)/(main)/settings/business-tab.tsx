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
import { Badge } from "@/components/ui/badge";
import { Building, EditPencil } from "iconoir-react";

export function BusinessTab({ organization }: { organization: any }) {
  // Eventually, we can add editing state here
  const handleEdit = () => {
    // Open modal or enable inputs
    console.log("Edit requested for", organization?.id);
  };

  if (!organization) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-500">
          No organization details found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Business Profile</CardTitle>
            <CardDescription>
              Details about your organization and verifying documents.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={handleEdit}>
            <EditPencil className="mr-2 h-4 w-4" /> Edit Details
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-600 border-4 border-white shadow-sm">
              {organization.name?.[0]?.toUpperCase() || "B"}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {organization.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="secondary"
                  className="bg-slate-100 text-slate-600"
                >
                  ID: {organization.id?.slice(0, 8)}...
                </Badge>
                {organization.subscription_status === "active" && (
                  <Badge className="bg-linear-to-r from-purple-500 to-blue-500 border-0">
                    Pro Plan
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Company Name
              </p>
              <p className="font-medium text-slate-900">{organization.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Industry
              </p>
              <p className="font-medium  text-slate-400 italic">Not set</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Ad Accounts Preview? */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Assets</CardTitle>
          <CardDescription>
            Ad accounts linked to this business.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Building className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">{organization.name} Ad Account</p>
                <p className="text-xs text-slate-500">Connected via Meta</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              Manage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
