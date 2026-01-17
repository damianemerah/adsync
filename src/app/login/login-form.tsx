"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { login } from "@/actions/auth";

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

export function LoginForm() {
  const [state, action] = useActionState(login, undefined);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  return (
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
        {state?.fieldErrors?.email && (
          <p className="text-xs text-red-600">{state.fieldErrors.email[0]}</p>
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
  );
}
