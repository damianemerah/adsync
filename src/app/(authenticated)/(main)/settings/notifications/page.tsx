"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SystemRestart, ChatBubble, Check } from "iconoir-react";
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
  useWhatsAppVerification,
} from "@/hooks/use-notification-settings";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsSettingsPage() {
  const { settings, isLoading } = useNotificationSettings();
  const { mutate: updateSettings } = useUpdateNotificationSettings();
  const { startVerification, confirmVerification, disconnect } =
    useWhatsAppVerification();

  // WhatsApp State
  const [whatsappNumber, setWhatsappNumber] = useState("+234");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  // Sync state with settings when loaded
  useEffect(() => {
    if (settings?.whatsapp_number) {
      setWhatsappNumber(settings.whatsapp_number);
    }
  }, [settings?.whatsapp_number]);

  const handleSendOtp = () => {
    startVerification.mutate(whatsappNumber, {
      onSuccess: () => setOtpSent(true),
    });
  };

  const handleVerifyOtp = () => {
    confirmVerification.mutate(otp, {
      onSuccess: () => {
        setOtpSent(false);
        setOtp("");
      },
    });
  };

  if (isLoading) {
    return <NotificationsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* WhatsApp Section */}
      <Card className="border-primary/20 shadow-sm border border-border bg-primary/5">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <ChatBubble className="h-5 w-5 text-primary" /> WhatsApp Alerts
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                Get critical alerts (Payment Failed, Ad Rejected) instantly on
                WhatsApp.
              </CardDescription>
            </div>
            <Badge
              variant={settings?.verified ? "default" : "secondary"}
              className={
                settings?.verified
                  ? "bg-primary hover:bg-primary/90"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }
            >
              {settings?.verified ? "Active" : "Not Connected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {!settings?.verified ? (
            <div className="space-y-4 max-w-sm">
              <div className="flex gap-2">
                <Input
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  disabled={otpSent || startVerification.isPending}
                  className="bg-background"
                  placeholder="+234..."
                />
                {!otpSent ? (
                  <Button
                    onClick={handleSendOtp}
                    disabled={startVerification.isPending || !whatsappNumber}
                  >
                    {startVerification.isPending ? (
                      <SystemRestart className="animate-spin" />
                    ) : (
                      "Verify"
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setOtpSent(false)}
                    disabled={confirmVerification.isPending}
                  >
                    Edit
                  </Button>
                )}
              </div>
              {otpSent && (
                <div className="flex gap-2 animate-in fade-in">
                  <Input
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="tracking-widest bg-background"
                  />
                  <Button
                    onClick={handleVerifyOtp}
                    disabled={confirmVerification.isPending || otp.length < 6}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {confirmVerification.isPending ? (
                      <SystemRestart className="animate-spin" />
                    ) : (
                      "Confirm"
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 p-3 rounded-md border border-primary/20 w-fit">
                <Check className="h-4 w-4" /> Connected to{" "}
                {settings.whatsapp_number}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
              >
                {disconnect.isPending ? (
                  <SystemRestart className="animate-spin h-4 w-4" />
                ) : (
                  "Disconnect"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Email Preferences</CardTitle>
          <CardDescription>
            Manage your email delivery settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PreferenceRow
            label="Payment Failed"
            description="When Meta/TikTok fails to charge your card."
            checked={settings?.alert_payment_failed ?? false}
            onCheckedChange={(checked) =>
              updateSettings({ alert_payment_failed: checked })
            }
          />
          <Separator />
          <PreferenceRow
            label="Ad Rejected"
            description="If your creative violates platform policies."
            checked={settings?.alert_ad_rejected ?? false}
            onCheckedChange={(checked) =>
              updateSettings({ alert_ad_rejected: checked })
            }
          />
          <Separator />
          <PreferenceRow
            label="Weekly Report"
            description="Receive a PDF summary every Monday."
            checked={settings?.alert_weekly_report ?? false}
            onCheckedChange={(checked) =>
              updateSettings({ alert_weekly_report: checked })
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

function PreferenceRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label className="text-base">{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[200px] w-full rounded-md" />
      <Skeleton className="h-[300px] w-full rounded-md" />
    </div>
  );
}
