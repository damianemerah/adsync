import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparks, WarningTriangle } from "iconoir-react";
import { useCampaignStore } from "@/stores/campaign-store";
import { useOrganization } from "@/hooks/use-organization";
import Link from "next/link";

export function CreativeCopyEditor() {
  const { objective, adCopy, destinationValue, updateDraft } = useCampaignStore();
  const { organization } = useOrganization();

  // Auto-fill WhatsApp number from org profile when objective is whatsapp and field is empty
  useEffect(() => {
    if (objective === "whatsapp" && !destinationValue && organization?.whatsapp_number) {
      updateDraft({ destinationValue: organization.whatsapp_number });
    }
  }, [objective, organization?.whatsapp_number, destinationValue, updateDraft]);

  const missingWhatsapp = objective === "whatsapp" && !destinationValue;

  return (
    <>
      <div className="space-y-2">
        <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
          Headline
        </label>
        <Input
          value={adCopy.headline}
          onChange={(e) =>
            updateDraft({
              adCopy: { ...adCopy, headline: e.target.value },
            })
          }
          placeholder="e.g. Limited Time Offer!"
          className="h-12 font-bold border-border bg-muted/30 focus-visible:ring-primary/20 rounded-md"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
          Primary Text
        </label>
        <Textarea
          value={adCopy.primary}
          onChange={(e) =>
            updateDraft({
              adCopy: { ...adCopy, primary: e.target.value },
            })
          }
          rows={5}
          placeholder="Tell people what your ad is about..."
          className="border-border bg-muted/30 focus-visible:ring-primary/20 resize-none rounded-md text-base"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
          {objective === "whatsapp" ? "WhatsApp Number" : "Website URL"}
        </label>
        <Input
          value={destinationValue}
          onChange={(e) => updateDraft({ destinationValue: e.target.value })}
          placeholder={
            objective === "whatsapp" ? "080 1234 5678" : "www.yoursite.com"
          }
          className="h-12 font-bold border-border bg-muted/30 focus-visible:ring-primary/20 rounded-md"
        />
        {objective === "whatsapp" && !missingWhatsapp && (
          <p className="text-[10px] text-subtle-foreground flex items-center gap-1">
            <Sparks className="h-3 w-3 text-primary" />
            We will auto-format this to a "Click to Chat" link.
          </p>
        )}
        {missingWhatsapp && (
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/5 border border-destructive/20 text-xs text-destructive">
            <WarningTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Enter your WhatsApp number above, or{" "}
              <Link
                href="/settings/business"
                className="underline font-semibold hover:text-destructive/80"
              >
                save it in Business Settings
              </Link>{" "}
              to auto-fill it here.
            </span>
          </div>
        )}
      </div>

      {/* WhatsApp pre-fill message — only shown for whatsapp objective */}
      {objective === "whatsapp" && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
            WhatsApp Message (pre-filled)
          </label>
          <Textarea
            value={adCopy.cta?.whatsappMessage ?? ""}
            onChange={(e) =>
              updateDraft({
                adCopy: {
                  ...adCopy,
                  cta: {
                    ...adCopy.cta,
                    whatsappMessage: e.target.value,
                  },
                },
              })
            }
            rows={3}
            placeholder="e.g. Hi! I saw your ad and I'm interested. What's available?"
            className="border-border bg-muted/30 focus-visible:ring-primary/20 resize-none rounded-md text-sm"
          />
          <p className="text-[10px] text-subtle-foreground flex items-center gap-1">
            <Sparks className="h-3 w-3 text-primary" />
            This is the message contacts send when they tap your ad. Edit it to
            match your tone.
          </p>
        </div>
      )}
    </>
  );
}
