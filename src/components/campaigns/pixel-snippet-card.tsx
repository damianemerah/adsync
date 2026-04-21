"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "iconoir-react";
import { toast } from "sonner";

interface PixelSnippetCardProps {
  pixelToken: string;
}

/**
 * Displays the pixel snippet for website campaigns.
 * Users paste this once in their <head> to track views & purchases.
 */
export function PixelSnippetCard({ pixelToken }: PixelSnippetCardProps) {
  const [copied, setCopied] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://Tenzu.app";

  const snippet = `<!-- Tenzu Pixel — paste once in <head> -->
<script>
(function(t){
  new Image().src = "${appUrl}/api/pixel?t="+t+"&e=view";
  document.addEventListener("Tenzu_purchase", function(e){
    new Image().src = "${appUrl}/api/pixel?t="+t+"&e=purchase&v="+(e.detail?.value||0);
  });
})("${pixelToken}");
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("Pixel snippet copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            🔗 Website Pixel
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Snippet
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-slate-500 mb-3">
          Paste this snippet once in your website&apos;s{" "}
          <code className="px-1 py-0.5 bg-slate-100 rounded text-xs">
            &lt;head&gt;
          </code>{" "}
          to track page views and purchases automatically.
        </p>
        <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto font-mono leading-relaxed">
          <code>{snippet}</code>
        </pre>
      </CardContent>
    </Card>
  );
}
