import { cn } from "@/lib/utils";
import { Hexagon } from "iconoir-react";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-bold text-xl", className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Hexagon className="h-5 w-5" strokeWidth={2.5} />
      </div>
      <span className="font-heading tracking-tight">AdSync</span>
    </div>
  );
}
