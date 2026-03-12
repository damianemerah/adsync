"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SystemRestart, Plus } from "iconoir-react";
import { createOrganization } from "@/actions/organization";
import { toast } from "sonner";

const INDUSTRIES = [
  "E-commerce (Fashion/Beauty)",
  "E-commerce (Electronics)",
  "Service Business",
  "Real Estate",
  "Food & Beverage",
  "Tech / SaaS",
  "Other",
];

interface CreateBusinessDialogProps {
  /** Controlled open state — if provided, renders without its own trigger button. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Custom trigger element. Only rendered when open/onOpenChange are NOT provided. */
  trigger?: React.ReactNode;
}

export function CreateBusinessDialog({
  open,
  onOpenChange,
  trigger,
}: CreateBusinessDialogProps) {
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled
    ? (onOpenChange ?? (() => {}))
    : setInternalOpen;

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      const result = await createOrganization(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Business created! Switching workspace…");
        setIsOpen(false);
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  const dialogContent = (
    <DialogContent className="max-w-xl sm:rounded-3xl p-6 sm:p-8 shadow-soft border-border/40 gap-6">
      <DialogHeader className="space-y-2">
        <DialogTitle className="text-2xl sm:text-3xl font-heading text-foreground">
          Create New Business
        </DialogTitle>
        <DialogDescription className="text-base text-subtle-foreground/90">
          Add a new workspace. Each business gets its own campaigns, creatives,
          and ad account connections.
        </DialogDescription>
      </DialogHeader>

      <form action={handleSubmit} className="space-y-6">
        <div className="space-y-2.5">
          <Label
            htmlFor="orgName"
            className="text-sm font-semibold text-foreground"
          >
            Business Name *
          </Label>
          <Input
            id="orgName"
            name="orgName"
            placeholder="e.g. Acme Boutique"
            required
            className="h-12 rounded-2xl bg-muted/40 border-transparent hover:bg-muted/60 focus:bg-background focus:border-ring transition-all px-4"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2.5">
            <Label
              htmlFor="industry"
              className="text-sm font-semibold text-foreground"
            >
              Industry
            </Label>
            <Select name="industry" defaultValue={INDUSTRIES[0]}>
              <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-transparent hover:bg-muted/60 focus:bg-background focus:border-ring transition-all px-4">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50 shadow-soft">
                {INDUSTRIES.map((ind) => (
                  <SelectItem
                    key={ind}
                    value={ind}
                    className="rounded-xl cursor-pointer"
                  >
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2.5">
            <Label
              htmlFor="sellingMethod"
              className="text-sm font-semibold text-foreground"
            >
              Selling Method
            </Label>
            <Select name="sellingMethod" defaultValue="online">
              <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-transparent hover:bg-muted/60 focus:bg-background focus:border-ring transition-all px-4">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50 shadow-soft">
                <SelectItem
                  value="online"
                  className="rounded-xl cursor-pointer"
                >
                  Online / Delivery
                </SelectItem>
                <SelectItem value="local" className="rounded-xl cursor-pointer">
                  In-Store / Local
                </SelectItem>
                <SelectItem value="both" className="rounded-xl cursor-pointer">
                  Both
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2.5">
          <Label
            htmlFor="businessDescription"
            className="text-sm font-semibold text-foreground"
          >
            Business Description
          </Label>
          <Textarea
            id="businessDescription"
            name="businessDescription"
            placeholder="Briefly describe what this business sells or does…"
            className="h-24 resize-none rounded-2xl bg-muted/40 border-transparent hover:bg-muted/60 focus:bg-background focus:border-ring transition-all p-4"
          />
          <p className="text-xs text-subtle-foreground/80 mt-1">
            Helps the AI generate more relevant ads for this workspace.
          </p>
        </div>

        <DialogFooter className="pt-2 sm:justify-end gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="rounded-3xl hover:bg-muted/50 text-subtle-foreground font-medium min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="rounded-3xl shadow-soft hover:shadow-md transition-all px-6 font-semibold"
          >
            {isLoading ? (
              <>
                <SystemRestart className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2 stroke-[3]" />
                Create & Switch
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );

  // Controlled mode — no trigger, Dialog open/close managed by parent
  if (isControlled) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  // Uncontrolled mode — renders its own trigger button
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && setIsOpen(true)}
        className="cursor-pointer inline-block"
      >
        {trigger ?? (
          <Button className="rounded-3xl shadow-sm px-5 font-semibold">
            <Plus className="w-4 h-4 mr-2 stroke-[3]" /> Create Business
          </Button>
        )}
      </div>
      {dialogContent}
    </Dialog>
  );
}
