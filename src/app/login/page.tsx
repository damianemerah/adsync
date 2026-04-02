import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Flash } from "iconoir-react";
import { SocialButtons } from "@/components/auth/social-buttons";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* LEFT: FORM SECTION */}
      <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-20 xl:px-24 bg-background">
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground border border-border">
              <Flash className="h-6 w-6 stroke-2" />
            </div>
            <span className="font-heading font-extrabold text-2xl text-foreground tracking-tight">
              AdSync
            </span>
          </div>

          <div className="space-y-2.5">
            <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">
              Welcome back
            </h1>
            <p className="text-base text-subtle-foreground">
              Please enter your details to sign in.
            </p>
          </div>

          {/* Wrap the form in Suspense boundary */}
          <Suspense
            fallback={
              <div className="h-64 animate-pulse bg-muted rounded-lg" />
            }
          >
            <LoginForm />
          </Suspense>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-background px-3 text-subtle-foreground font-semibold">
                Or continue with
              </span>
            </div>
          </div>

          <SocialButtons action="Sign in" />

          <p className="text-center text-sm text-subtle-foreground">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="font-bold text-foreground hover:text-primary transition-colors hover:underline underline-offset-4"
            >
              Sign up for free
            </Link>
          </p>
        </div>
      </div>

      {/* RIGHT: BRAND SECTION */}
      <div className="hidden lg:flex flex-col justify-center bg-foreground text-background p-12 relative overflow-hidden">
        <div className="relative z-10 max-w-lg mx-auto">
          <h2 className="text-[3.5rem] font-heading font-extrabold leading-[1.1] mb-6 tracking-tight">
            Gets social.
            <br />
            Knows your brand.
            <br />
            <span className="text-primary">Ready to scale.</span>
          </h2>
        </div>
      </div>
    </div>
  );
}
