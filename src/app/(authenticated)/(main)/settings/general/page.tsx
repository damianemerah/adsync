"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="space-y-12">
      {/* Personal Info Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-lg font-heading text-foreground">
            Personal Info
          </h3>
          <p className="text-sm text-subtle-foreground">
            Update your personal details and how we can reach you.
          </p>
        </div>

        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <form onSubmit={handleSubmit}>
              <CardContent className="pt-6">
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
        </div>
      </section>

      <hr className="border-border/50" />

      {/* Change Password Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-lg font-heading text-foreground">
            Security
          </h3>
          <p className="text-sm text-subtle-foreground">
            Update your password to ensure your account remains secure.
          </p>
        </div>

        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardContent className="pt-6">
              <p className="text-sm text-foreground">
                We will send a secure password reset link to your registered email address. Follow the instructions in the email to set a new password.
              </p>
            </CardContent>

            <CardFooter className="border-t border-border bg-muted/20 px-6 py-4 flex justify-end">
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
                  "Send Reset Email"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      <hr className="border-border/50" />

      {/* Delete Account Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-lg font-heading text-destructive">
            Danger Zone
          </h3>
          <p className="text-sm text-subtle-foreground">
            Permanently remove your data and access.
          </p>
        </div>

        <div className="lg:col-span-2">
          <Card className="overflow-hidden border-destructive/20">
            <CardContent className="pt-6">
              <p className="text-sm text-foreground">
                Once you delete your account, there is no going back. All your campaigns, data, and settings will be permanently erased. Please be certain.
              </p>
            </CardContent>

            <CardFooter className="border-t border-destructive/20 bg-destructive/5 px-6 py-4 flex justify-end">
              <Button
                variant="destructive"
                className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 shadow-none"
              >
                Delete Account
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </div>
  );
}
