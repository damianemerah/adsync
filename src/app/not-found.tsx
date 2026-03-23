import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, ArrowLeft, Home } from "iconoir-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-blue-50/20 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl rounded-lg p-12 bg-white/80 backdrop-blur text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100 mb-6">
          <Search className="w-12 h-12 text-red-600" />
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold text-slate-900">404</h1>
            <h2 className="text-2xl font-semibold text-slate-900">
              Campaign Not Found
            </h2>
          </div>

          <p className="text-slate-600 max-w-md mx-auto text-balance">
            Looks like you targeted a page that doesn't exist. Let's get you
            back on track.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Button
            asChild
            variant="outline"
            className="flex-1 h-12 bg-transparent"
          >
            <Link href="javascript:history.back()">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Link>
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
              className="text-blue-600 hover:underline font-medium"
            >
              Contact Support
            </Link>
          </p>
        </div>
      </Card>

      {/* Additional Help */}
      <div className="mt-8 text-center">
        <p className="text-sm text-slate-500 mb-4">Quick Links:</p>
        <div className="flex gap-4 text-sm">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Dashboard
          </Link>
          <Link href="/campaigns" className="text-blue-600 hover:underline">
            Campaigns
          </Link>
          <Link href="/creatives" className="text-blue-600 hover:underline">
            Creatives
          </Link>
          <Link href="/settings" className="text-blue-600 hover:underline">
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
