"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SystemRestart, Eye, EyeClosed } from "iconoir-react";
import { login } from "@/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full h-14 rounded-lg bg-foreground hover:bg-foreground/90 text-background text-base font-bold shadow-sm border border-border transition-all scale-100 hover:scale-[1.02] active:scale-[0.98]"
      disabled={pending}
    >
      {pending ? (
        <SystemRestart className="animate-spin mr-2 stroke-3" />
      ) : (
        "Sign in"
      )}
    </Button>
  );
}
export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [state, action] = useActionState(login, null);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="redirectTo" value={next} />
      <div className="space-y-2.5">
        <Label
          htmlFor="email"
          className="text-sm font-semibold text-foreground"
        >
          Email address
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="name@company.com"
          className="h-12 rounded-lg bg-muted/40 border-transparent hover:bg-muted/60 focus:bg-background focus:border-ring transition-all px-4"
          defaultValue=""
          aria-invalid={!!state?.fieldErrors?.email}
        />
        {state?.fieldErrors?.email && (
          <p className="text-xs text-destructive font-medium">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <Label
            htmlFor="password"
            className="text-sm font-semibold text-foreground"
          >
            Password
          </Label>
          <Link
            href="/forgot-password"
            className="text-xs font-bold text-foreground hover:text-primary transition-colors hover:underline underline-offset-4"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            className="h-12 rounded-lg bg-muted/40 border-transparent hover:bg-muted/60 focus:bg-background focus:border-ring transition-all px-4 pr-12"
            defaultValue=""
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
        <p className="text-sm text-destructive bg-destructive/10 p-4 rounded-lg font-medium">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
