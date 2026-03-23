import Link from "next/link";
import { Suspense } from "react";
import { Mail } from "iconoir-react";
import { ResendButton } from "./resend-button";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-slate-100 p-8 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Verify Your E-mail Address
        </h1>

        <div className="bg-slate-50 rounded-lg p-6 mb-8 border border-slate-100">
          <p className="text-slate-600 mb-2">
            You&apos;re close to full access to AdSync.
          </p>
          <p className="text-slate-900 font-medium">
            Check your e-mail and click the verification link to finish signing
            up.
          </p>
        </div>

        <p className="text-sm text-slate-500 mb-8">
          Didn&apos;t receive the e-mail?{" "}
          <Suspense
            fallback={<span className="text-slate-400">Loading...</span>}
          >
            <ResendButton />
          </Suspense>
        </p>

        <Link
          href="/login"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
        >
          ← Back to Sign-In
        </Link>
      </div>
    </div>
  );
}
