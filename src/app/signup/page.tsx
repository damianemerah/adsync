import Link from "next/link";
import { Suspense } from "react";
import { SocialButtons } from "@/components/auth/social-buttons";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
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

      <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-20 xl:px-24 bg-background">
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="space-y-2.5">
            <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">
              Create your account
            </h1>
            <p className="text-base text-subtle-foreground">
              Start managing your ads in minutes.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider">
              Sign up with
            </p>
            <SocialButtons action="Sign up" />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-background px-3 text-subtle-foreground font-semibold">
                Or using email
              </span>
            </div>
          </div>

          {/* Wrap the form in Suspense boundary */}
          <Suspense
            fallback={
              <div className="h-80 animate-pulse bg-muted rounded-lg" />
            }
          >
            <SignupForm />
          </Suspense>

          <p className="text-center text-sm text-subtle-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-foreground hover:text-primary transition-colors hover:underline underline-offset-4"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
