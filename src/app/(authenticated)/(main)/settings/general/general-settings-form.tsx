"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SystemRestart } from "iconoir-react";
import { useAuth } from "@/components/providers/auth-provider";
import { updateProfile, updatePassword } from "@/actions/settings";
import { toast } from "sonner";
import { PhoneInput } from "@/components/ui/phone-input";

export function GeneralSettingsForm() {
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const initialPhone = user?.user_metadata?.phone || "";
  const initialCountryCode = user?.user_metadata?.country_code || "+234";
  const defaultPhone = initialPhone.startsWith("+") 
    ? initialPhone 
    : (initialPhone ? `${initialCountryCode}${initialPhone}` : "");

  const [phone, setPhone] = useState<string>(defaultPhone);

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

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await updatePassword(newPassword);
      if (result.error) throw new Error(result.error);
      toast.success("Password updated successfully!");
      (e.target as HTMLFormElement).reset();
    } catch (e: any) {
      toast.error(e.message || "Failed to update password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <Card className="border-border">
        <CardHeader className="pb-6">
          <CardTitle className="text-lg font-heading font-medium">Personal Info</CardTitle>
          <CardDescription>Manage your personal information</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs font-medium">Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  defaultValue={user?.user_metadata?.full_name || ""}
                  placeholder="Enter your name"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium">E-mail</Label>
                <Input
                  id="email"
                  defaultValue={user?.email || ""}
                  disabled
                  className="bg-muted text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-medium">Phone Number</Label>
                <input type="hidden" name="phone" value={phone} />
                <input type="hidden" name="countryCode" value={initialCountryCode} />
                <PhoneInput
                  id="phone"
                  value={phone}
                  onChange={(v) => setPhone(v ? String(v) : "")}
                  placeholder="706 676 5698"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job" className="text-xs font-medium">Your Job</Label>
                <Select name="job" defaultValue={user?.user_metadata?.job || ""}>
                  <SelectTrigger className="bg-background w-full border border-border shadow-xs focus-visible:border-none focus-visible:ring-ring/50 focus-visible:ring-[3px]">
                    <SelectValue placeholder="Choose Your Job" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business_owner">Business Owner</SelectItem>
                    <SelectItem value="marketer">Marketer</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end pt-2 pb-6 px-6">
            <Button type="submit" disabled={isPending} className="px-6">
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

      <Card className="border-border">
        <CardHeader className="pb-6">
          <CardTitle className="text-lg font-heading font-medium">Change Password</CardTitle>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <form onSubmit={handlePasswordChange}>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-xs font-medium">Current Password</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  placeholder="Password"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-xs font-medium">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="New Password"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs font-medium">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm Password"
                  className="bg-background"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end pt-2 pb-6 px-6">
            <Button type="submit" disabled={isChangingPassword} className="px-6">
              {isChangingPassword ? (
                <>
                  <SystemRestart className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
