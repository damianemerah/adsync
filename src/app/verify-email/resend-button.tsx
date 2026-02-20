"use client";

import { useState, useTransition } from "react";
import { resendVerificationEmail } from "@/actions/auth";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function ResendButton() {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const handleResend = () => {
    if (!email) {
      toast.error("Email address not found. Please sign in again.");
      return;
    }

    startTransition(async () => {
      const result = await resendVerificationEmail(email);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Verification email sent!");
      }
    });
  };

  return (
    <button
      onClick={handleResend}
      disabled={isPending}
      className="text-primary hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? "Sending..." : "Click to Resend"}
    </button>
  );
}
