"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SystemRestart } from "iconoir-react";
import { useAuth } from "@/components/providers/auth-provider";
import { updateProfile } from "@/actions/settings";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function GeneralSettingsPage() {
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Profile updated successfully!");
      }
    });
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast.error("No email found for your account.");
      return;
    }
    setIsResettingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/settings/general`,
      });
      if (error) throw error;
      toast.success("Password reset email sent! Check your inbox.");
    } catch (e: any) {
      toast.error(e.message || "Failed to send reset email");
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Personal Info Card */}
      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-heading font-bold text-foreground">
                Personal Info
              </h3>
              <p className="text-sm text-subtle-foreground">
                Manage your personal information
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  defaultValue={user?.user_metadata?.full_name || ""}
                  placeholder="Enter your name"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  defaultValue={user?.email || ""}
                  disabled
                  className="bg-muted text-muted-foreground"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t border-border bg-muted/20 px-6 py-4 flex justify-end">
            <Button type="submit" disabled={isPending} className="font-bold">
              {isPending ? (
                <>
                  <SystemRestart className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Change Password Section */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-heading font-bold text-foreground">
              Change Password
            </h3>
            <p className="text-sm text-subtle-foreground">
              Update your password to secure your account.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Password</p>
              <p className="text-sm text-muted-foreground">
                Use a strong, unique password for your account.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handlePasswordReset}
              disabled={isResettingPassword}
            >
              {isResettingPassword ? (
                <>
                  <SystemRestart className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-destructive">Delete Account</p>
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
