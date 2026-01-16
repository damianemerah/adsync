"use client";

import { useState } from "react";
import { AlertTriangle, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function VerificationBanner() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // 1. If user is missing or already verified, hide banner
  // Social logins (Google) usually come auto-verified
  if (
    !user ||
    user.email_confirmed_at ||
    user.app_metadata.provider !== "email"
  ) {
    return null;
  }

  if (!isVisible) return null;

  const handleResend = async () => {
    setIsSending(true);
    const supabase = createClient();

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email!,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setIsSending(false);

    if (error) {
      toast.error("Error:", {
        description: error.message,
      });
    } else {
      toast.success("Email Sent", {
        description: "Check your inbox for the verification link.",
      });
    }
  };

  return (
    <div className="bg-yellow-50 border-b border-yellow-100 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-yellow-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-yellow-900">
              Verify your email address
            </p>
            <p className="text-xs text-yellow-700">
              You need to verify <strong>{user.email}</strong> to launch
              campaigns.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleResend}
            disabled={isSending}
            className="h-8 bg-white border-yellow-200 text-yellow-800 hover:bg-yellow-100"
          >
            <Mail className="w-3 h-3 mr-2" />
            {isSending ? "Sending..." : "Resend Email"}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-yellow-700 hover:bg-yellow-100"
            onClick={() => setIsVisible(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
