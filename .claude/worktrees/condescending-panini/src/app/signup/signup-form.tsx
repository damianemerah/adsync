"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SystemRestart, Eye, EyeClosed } from "iconoir-react";
import { signup } from "@/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full h-14 rounded-3xl bg-primary hover:bg-primary/90 text-primary-foreground text-base font-bold shadow-soft hover:shadow-md transition-all scale-100 hover:scale-[1.02] active:scale-[0.98]"
      disabled={pending}
    >
      {pending ? (
        <SystemRestart className="animate-spin mr-2 stroke-3" />
      ) : (
        "Create Account"
      )}
    </Button>
  );
}
export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [state, action] = useActionState(signup, null);

  useEffect(() => {
    if (state?.error) {
      toast.error("Signup Failed", { description: state.error });
    }
  }, [state]);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2.5">
        <Label
          htmlFor="fullName"
          className="text-sm font-semibold text-foreground"
        >
          Full Name
        </Label>
        <Input
          id="fullName"
          name="fullName"
          placeholder="e.g. Adeola Smith"
          className="h-12 rounded-2xl bg-muted/40 border-transparent hover:bg-muted/60 focus:bg-background focus:border-ring transition-all px-4"
          required
          aria-invalid={!!state?.fieldErrors?.fullName}
        />
        {state?.fieldErrors?.fullName && (
          <p className="text-xs text-destructive font-medium">
            {state.fieldErrors.fullName[0]}
          </p>
        )}
      </div>
      <div className="space-y-2.5">
        <Label
          htmlFor="email"
          className="text-sm font-semibold text-foreground"
        >
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          className="h-12 rounded-2xl bg-muted/40 border-transparent hover:bg-muted/60 focus:bg-background focus:border-ring transition-all px-4"
          required
          aria-invalid={!!state?.fieldErrors?.email}
        />
        {state?.fieldErrors?.email && (
          <p className="text-xs text-destructive font-medium">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>
      <div className="space-y-2.5">
        <Label
          htmlFor="password"
          className="text-sm font-semibold text-foreground"
        >
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            className="h-12 rounded-2xl bg-muted/40 border-transparent hover:bg-muted/60 focus:bg-background focus:border-ring transition-all px-4 pr-12"
            required
            minLength={8}
            aria-invalid={!!state?.fieldErrors?.password}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeClosed className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
        {state?.fieldErrors?.password && (
          <p className="text-xs text-destructive font-medium">
            {state.fieldErrors.password[0]}
          </p>
        )}
      </div>

      {state?.error && (
        <p className="text-sm text-destructive bg-destructive/10 p-4 rounded-2xl font-medium">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
