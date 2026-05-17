"use client";

import { Button } from "@/components/ui/button";
import { Search, ArrowLeft, Home } from "iconoir-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-50 mb-8">
          <Search className="w-12 h-12 text-red-600" />
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h1 className="text-6xl font-bold text-slate-900">404</h1>
          <h2 className="text-2xl font-semibold text-slate-900">
            Campaign Not Found
          </h2>

          <p className="text-slate-600 max-w-md mx-auto text-balance">
            Looks like you targeted a page that doesn't exist. Let's get you
            back on track.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Button asChild className="flex-1 h-12">
            <Link href="/dashboard">
              <Home className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Link>
          </Button>
        </div>

        {/* Help Link */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Still can't find what you're looking for?{" "}
            <Link
              href="/support"
              className="text-primary hover:underline font-medium"
            >
              Contact Support
            </Link>
          </p>
        </div>
      </div>

      {/* Additional Help */}
      <div className="mt-12 text-center">
        <p className="text-sm text-slate-500 mb-4">Quick Links:</p>
        <div className="flex gap-4 text-sm">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
            Dashboard
          </Link>
          <Link href="/campaigns" className="text-slate-600 hover:text-slate-900">
            Campaigns
          </Link>
          <Link href="/creatives" className="text-slate-600 hover:text-slate-900">
            Creatives
          </Link>
          <Link href="/settings" className="text-slate-600 hover:text-slate-900">
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
