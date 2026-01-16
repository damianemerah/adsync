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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  CreditCard,
  Bell,
  Shield,
  LogOut,
  Check,
  Loader2,
  MessageSquare,
  Smartphone,
  Mail,
  Zap,
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);

  // WhatsApp State
  const [whatsappNumber, setWhatsappNumber] = useState("+234");
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1500);
  };

  const sendOtp = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setOtpSent(true);
    }, 1500);
  };

  const verifyOtp = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setVerified(true);
      setOtpSent(false);
    }, 1500);
  };

  return (
    <div>
      <main className="flex-1 p-8 max-w-5xl w-full mx-auto">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          orientation="vertical"
          className="flex flex-col md:flex-row gap-8"
        >
          {/* Sidebar Tabs */}
          <aside className="w-full md:w-64 shrink-0">
            <TabsList className="flex flex-col h-auto bg-transparent space-y-1 p-0">
              <SettingsTab
                value="profile"
                icon={User}
                label="Profile"
                active={activeTab === "profile"}
              />
              <SettingsTab
                value="notifications"
                icon={Bell}
                label="Notifications"
                active={activeTab === "notifications"}
              />
              <SettingsTab
                value="security"
                icon={Shield}
                label="Security"
                active={activeTab === "security"}
              />
            </TabsList>
          </aside>

          {/* Content Area */}
          <div className="flex-1 space-y-6">
            {/* --- PROFILE TAB --- */}
            <TabsContent value="profile" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Update your photo and personal details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src="https://github.com/shadcn.png" />
                      <AvatarFallback>AO</AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm">
                        Change Photo
                      </Button>
                      <p className="text-xs text-slate-500">
                        JPG, GIF or PNG. Max size of 800K
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input defaultValue="Adeola" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input defaultValue="Oluwasegun" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Email Address</Label>
                      <Input defaultValue="adeola@store.com" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-slate-50 px-6 py-4">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* --- NOTIFICATIONS TAB (WhatsApp Logic) --- */}
            <TabsContent value="notifications" className="mt-0 space-y-6">
              <Card className="border-blue-200 shadow-sm">
                <CardHeader className="bg-blue-50/50 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-blue-900 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" /> WhatsApp Companion
                      </CardTitle>
                      <CardDescription className="text-blue-700/80 mt-1">
                        Get instant alerts when your ad account needs attention.
                      </CardDescription>
                    </div>
                    <Badge
                      variant={verified ? "default" : "secondary"}
                      className={
                        verified
                          ? "bg-green-600 hover:bg-green-600"
                          : "bg-slate-200 text-slate-600"
                      }
                    >
                      {verified ? "Active" : "Not Connected"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {!verified ? (
                    <div className="space-y-4 max-w-sm">
                      <div className="space-y-2">
                        <Label>WhatsApp Number</Label>
                        <div className="flex gap-2">
                          <Input
                            value={whatsappNumber}
                            onChange={(e) => setWhatsappNumber(e.target.value)}
                            placeholder="+234..."
                            disabled={otpSent}
                          />
                          {!otpSent ? (
                            <Button
                              onClick={sendOtp}
                              disabled={
                                isVerifying || whatsappNumber.length < 10
                              }
                            >
                              {isVerifying ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Verify"
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => setOtpSent(false)}
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>

                      {otpSent && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                          <Label>Enter OTP Code</Label>
                          <div className="flex gap-2">
                            <Input
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              placeholder="123456"
                              className="tracking-widest font-mono text-center text-lg"
                              maxLength={6}
                            />
                            <Button
                              onClick={verifyOtp}
                              disabled={isVerifying || otp.length < 6}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {isVerifying ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Confirm"
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-slate-500">
                            We sent a code to your WhatsApp.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                        <Check className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">
                          Connected to {whatsappNumber}
                        </p>
                        <p>You will receive critical alerts here.</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setVerified(false)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alert Preferences</CardTitle>
                  <CardDescription>
                    Choose what you want to be notified about.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Payment Failed</Label>
                      <p className="text-sm text-slate-500">
                        When Meta/TikTok fails to charge your card.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Ad Rejected</Label>
                      <p className="text-sm text-slate-500">
                        If your creative violates platform policies.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Low Budget Warning</Label>
                      <p className="text-sm text-slate-500">
                        When a campaign has spent 90% of daily budget.
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Weekly Report</Label>
                      <p className="text-sm text-slate-500">
                        Receive a PDF summary every Monday.
                      </p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- SECURITY TAB --- */}
            <TabsContent value="security" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input type="password" />
                  </div>
                  <Button>Update Password</Button>
                </CardContent>
              </Card>
              <Card className="border-red-100">
                <CardHeader>
                  <CardTitle className="text-red-600">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">Delete Account</p>
                      <p className="text-sm text-slate-500">
                        Permanently remove your data.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      className="border-red-200 hover:text-red-600 hover:bg-red-50"
                    >
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}

function SettingsTab({ value, icon: Icon, label, active }: any) {
  return (
    <TabsTrigger
      value={value}
      className={`w-full justify-start gap-3 px-4 py-3 rounded-xl transition-all ${
        active
          ? "bg-white text-blue-600 shadow-sm border border-slate-200"
          : "bg-transparent text-slate-500 hover:bg-white/50 hover:text-slate-900"
      }`}
    >
      <Icon
        className={`h-4 w-4 ${active ? "text-blue-600" : "text-slate-400"}`}
      />
      <span className="font-medium">{label}</span>
    </TabsTrigger>
  );
}
