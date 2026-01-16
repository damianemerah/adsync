"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Zap } from "lucide-react";

export function SubscriptionGate({
  children,
  status,
}: {
  children: React.ReactNode;
  status: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 1. Allow access if active or trial
  if (status === "active" || status === "trialing") {
    return <>{children}</>;
  }

  // 2. Allow access to billing page even if expired (so they can pay)
  if (pathname === "/billing") {
    return <>{children}</>;
  }

  // Prevent hydration mismatch
  if (!isClient) return null;

  // 3. Block everything else
  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <Card className="w-full max-w-md border-red-200 bg-red-50/50 shadow-xl text-center">
        <CardContent className="pt-10 pb-10 space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <Lock className="h-10 w-10 text-red-600" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Access Locked</h2>
            <p className="text-slate-600">
              Your subscription has expired. Please renew your plan to continue managing your campaigns.
            </p>
          </div>

          <Button
            size="lg"
            className="w-full bg-red-600 hover:bg-red-700 font-bold shadow-lg shadow-red-600/20"
            onClick={() => router.push("/billing")}
          >
            <Zap className="mr-2 h-4 w-4" /> Reactivate Plan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
