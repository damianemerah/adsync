"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MetaIcon } from "@/components/ui/meta-icon";

interface ConnectAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectAccountDialog({
  open,
  onOpenChange,
}: ConnectAccountDialogProps) {
  const handleConnectMeta = () => {
    window.location.href = "/api/connect/meta";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Ad Account</DialogTitle>
          <DialogDescription>Choose a platform to connect.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {/* META BUTTON */}
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 hover:border-facebook hover:bg-facebook/5"
            onClick={handleConnectMeta}
          >
            <MetaIcon className="h-10 w-10" />
            <span className="font-bold text-foreground">Meta Ads</span>
          </Button>

          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 hover:border-foreground hover:bg-muted"
            onClick={() => alert("Coming soon in Phase 2")}
          >
            <span className="h-8 w-8 flex items-center justify-center font-black text-2xl">
              Tk
            </span>
            <span className="font-bold text-foreground">TikTok Ads</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
