"use client";

import Link from "next/link";
import { useActionState } from "react"; // CHANGED: Import from 'react'
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Loader2 } from "lucide-react";
import { SocialButtons } from "@/components/auth/social-buttons";
import { login } from "@/actions/auth";
import { useSearchParams } from "next/navigation";

// Helper component for the Submit Button
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-base font-bold"
      disabled={pending}
    >
      {pending ? <Loader2 className="animate-spin mr-2" /> : "Sign in"}
    </Button>
  );
}

export default function LoginPage() {
  // CHANGED: Use useActionState instead of useFormState
  const [state, action] = useActionState(login, undefined);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* LEFT: FORM SECTION */}
      <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-20 xl:px-24 bg-white">
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <span className="font-heading font-bold text-xl text-slate-900">
              AdSync
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
            <p className="text-slate-500">
              Please enter your details to sign in.
            </p>
          </div>

          {/* Form uses the 'action' from useActionState */}
          <form action={action} className="space-y-5">
            <input type="hidden" name="redirectTo" value={next} />
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@company.com"
                className="h-12 bg-slate-50 border-slate-200"
                defaultValue=""
                aria-invalid={!!state?.fieldErrors?.email}
              />
              {/* Show Field Error */}
              {state?.fieldErrors?.email && (
                <p className="text-xs text-red-600">
                  {state.fieldErrors.email[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                className="h-12 bg-slate-50 border-slate-200"
                defaultValue=""
              />
              {/* Show Field Error */}
              {state?.fieldErrors?.password && (
                <p className="text-xs text-red-600">
                  {state.fieldErrors.password[0]}
                </p>
              )}
            </div>

            {/* Show Global Error */}
            {state?.error && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {state.error}
              </p>
            )}

            <SubmitButton />
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">
                Or continue with
              </span>
            </div>
          </div>

          <SocialButtons action="Sign in" />

          <p className="text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="font-bold text-blue-600 hover:underline"
            >
              Sign up for free
            </Link>
          </p>
        </div>
      </div>

      {/* RIGHT: BRAND SECTION */}
      <div className="hidden lg:flex flex-col justify-center bg-[#0F172A] text-white p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[120px] opacity-20 -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600 rounded-full blur-[120px] opacity-20 -ml-20 -mb-20"></div>
        <div className="relative z-10 max-w-lg mx-auto">
          <h2 className="text-5xl font-heading font-extrabold leading-tight mb-6">
            Gets social.
            <br />
            Knows your brand.
            <br />
            <span className="text-blue-500">Ready to scale.</span>
          </h2>
        </div>
      </div>
    </div>
  );
}
