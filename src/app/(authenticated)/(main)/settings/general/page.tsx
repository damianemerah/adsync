"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SystemRestart } from "iconoir-react";
import { useAuth } from "@/components/providers/auth-provider";

export default function GeneralSettingsPage() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Manage your personal details and contact info.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 border border-border">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {user?.email?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline" size="sm">
                Change Photo
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, GIF or PNG. Max size of 800K
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                defaultValue={user?.user_metadata?.full_name}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                defaultValue={user?.email}
                disabled
                className="bg-muted text-muted-foreground"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t border-border bg-muted/20 px-6 py-4 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="font-bold"
          >
            {isSaving ? (
              <>
                <SystemRestart className="mr-2 h-4 w-4 animate-spin" />{" "}
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Security Card */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Update your password and secure your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-foreground">Password</p>
              <p className="text-sm text-muted-foreground">
                Last changed 3 months ago
              </p>
            </div>
            <Button variant="outline">Change Password</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-destructive">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently remove your data and access.
              </p>
            </div>
            <Button
              variant="destructive"
              className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 shadow-none"
            >
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
