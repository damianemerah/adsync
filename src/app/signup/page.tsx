"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Loader2 } from "lucide-react";
import { SocialButtons } from "@/components/auth/social-buttons";
import { signup } from "@/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-base font-bold shadow-lg shadow-blue-600/20"
      disabled={pending}
    >
      {pending ? <Loader2 className="animate-spin mr-2" /> : "Create Account"}
    </Button>
  );
}

export default function SignupPage() {
  const [state, action] = useActionState(signup, undefined);

  useEffect(() => {
    if (state?.error) {
      toast.error("Signup Failed", { description: state.error });
    }
  }, [state]);

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
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

      <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-20 xl:px-24 bg-white">
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">
              Create your account
            </h1>
            <p className="text-slate-500">
              Start managing your ads in minutes.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase">
              Sign up with
            </p>
            <SocialButtons action="Sign up" />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">
                Or using email
              </span>
            </div>
          </div>

          {/* Form using Server Action */}
          <form action={action} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="e.g. Adeola Smith"
                className="h-12 bg-slate-50 border-slate-200"
                required
                aria-invalid={!!state?.fieldErrors?.fullName}
              />
              {state?.fieldErrors?.fullName && (
                <p className="text-xs text-red-600">
                  {state.fieldErrors.fullName[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                className="h-12 bg-slate-50 border-slate-200"
                required
                aria-invalid={!!state?.fieldErrors?.email}
              />
              {state?.fieldErrors?.email && (
                <p className="text-xs text-dered-600">
                  {state.fieldErrors.email[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                className="h-12 bg-slate-50 border-slate-200"
                required
                minLength={8}
                aria-invalid={!!state?.fieldErrors?.password}
              />
              {state?.fieldErrors?.password && (
                <p className="text-xs text-red-600">
                  {state.fieldErrors.password[0]}
                </p>
              )}
            </div>

            {state?.error && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {state.error}
              </p>
            )}

            <SubmitButton />
          </form>

          <p className="text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-slate-900 hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
