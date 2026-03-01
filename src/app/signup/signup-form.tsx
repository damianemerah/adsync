"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SystemRestart } from "iconoir-react";
import { signup } from "@/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-base font-bold shadow-lg shadow-blue-600/20"
      disabled={pending}
    >
      {pending ? (
        <SystemRestart className="animate-spin mr-2" />
      ) : (
        "Create Account"
      )}
    </Button>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signup, null);

  useEffect(() => {
    if (state?.error) {
      toast.error("Signup Failed", { description: state.error });
    }
  }, [state]);

  return (
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
          <p className="text-xs text-red-600">{state.fieldErrors.email[0]}</p>
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
  );
}
