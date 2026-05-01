"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, NavArrowDown, NavArrowRight } from "iconoir-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PixelSnippetCardProps {
  orgPixelToken: string;
}

/**
 * Displays the Tenzu Pixel snippet for website owners.
 * Paste once in <head> — works for all campaigns automatically.
 * Attribution is resolved via the ?_ta= param Tenzu appends at redirect time.
 */
export function PixelSnippetCard({ orgPixelToken }: PixelSnippetCardProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://Tenzu.app";

  const snippet = `<!-- Tenzu Pixel — paste once in <head> -->
<script>
(function(t){
  var p=new URLSearchParams(location.search).get('_ta');
  if(p) sessionStorage.setItem('_tenzu_ta',p);
  else p=sessionStorage.getItem('_tenzu_ta');
  var b="${appUrl}/api/pixel?t="+t+(p?"&_ta="+p:"");
  new Image().src=b+"&e=view";
  document.addEventListener("Tenzu_purchase",function(e){
    new Image().src=b+"&e=purchase&v="+(e.detail?.value||0);
  });
  document.addEventListener("Tenzu_lead",function(){
    new Image().src=b+"&e=lead";
  });
})("${orgPixelToken}");
</script>`;

  const purchaseSnippet = `document.dispatchEvent(new CustomEvent("Tenzu_purchase", {
  detail: { value: 15000 } // replace with actual NGN amount
}));`;

  const leadSnippet = `document.dispatchEvent(new CustomEvent("Tenzu_lead"));`;

  const handleCopy = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("Pixel snippet copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border border-border rounded-lg bg-muted/20"
    >
      <div className="flex items-center justify-between p-3 px-4">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 font-medium hover:bg-muted text-foreground flex items-center gap-2 -ml-2">
            {isOpen ? <NavArrowDown className="h-4 w-4 text-subtle-foreground" /> : <NavArrowRight className="h-4 w-4 text-subtle-foreground" />}
            {isOpen ? "Hide code snippet" : "Show code snippet"}
          </Button>
        </CollapsibleTrigger>
        <Button
          variant="secondary"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-status-success" />
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
      <CollapsibleContent>
        <div className="p-4 pt-0 space-y-4">
          <pre className="bg-[#0f172a] text-[#f8fafc] text-xs rounded-md p-4 overflow-x-auto font-mono leading-relaxed border border-slate-800 shadow-inner">
            <code>{snippet}</code>
          </pre>

          <div className="space-y-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground text-sm">After installing, fire these events on the right pages:</p>

            <div className="space-y-1">
              <p className="font-medium text-foreground">Track a purchase — on your order confirmation page:</p>
              <pre className="bg-muted rounded-md p-3 font-mono overflow-x-auto leading-relaxed">{purchaseSnippet}</pre>
            </div>

            <div className="space-y-1">
              <p className="font-medium text-foreground">Track a lead — on your form thank-you page:</p>
              <pre className="bg-muted rounded-md p-3 font-mono overflow-x-auto leading-relaxed">{leadSnippet}</pre>
            </div>

            <p className="text-xs">
              The pixel handles page views automatically. You only need to fire these events for conversions.
            </p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
