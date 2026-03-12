import Image from "next/image";
import { useState } from "react";
import { Checkbox } from "../ui/checkbox";
import { GraphUp, Play, Sparks, Trash, MoreVert } from "iconoir-react";
import { Creative } from "@/types";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

export function CreativeCard({
  data,
  selected,
  onSelect,
  onClick,
  onDelete,
}: {
  data: Creative;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onDelete?: (id: string) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={cn(
        "group relative bg-card rounded-3xl border shadow-soft hover:shadow-lg transition-all duration-300 overflow-hidden",
        selected ? "ring-2 ring-primary border-primary" : "border-border",
      )}
    >
      {/* ---- IMAGE AREA ---- */}
      <div
        className="aspect-square relative bg-muted cursor-pointer"
        // Open preview on image click only — does NOT toggle selection
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <Image
          src={data.thumbnail_url || data.original_url}
          alt={data.name || "Creative"}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Video play overlay */}
        {data.media_type === "video" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
            <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-current" />
            </div>
          </div>
        )}

        {/* Live badge */}
        {data.isLive && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 pointer-events-none">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </div>
        )}

        {/* AI-generated watermark on hover */}
        {data.media_type === "generated_image" && (
          <div className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-white text-[10px] font-medium flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 pointer-events-none">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            Generated with AdSync
          </div>
        )}
      </div>

      {/* ---- CHECKBOX (top-right, hover) ---- */}
      <div
        className="absolute top-2 right-2 flex flex-col gap-2 z-10"
        // Always show when selected; show on hover otherwise
        style={{ opacity: selected ? 1 : undefined }}
      >
        <div
          className={cn(
            "transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => {
              onSelect();
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-6 w-6 rounded-full border-white/50 bg-black/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground"
          />
        </div>
      </div>

      {/* ---- FOOTER ---- */}
      <div
        className="p-3"
        // Clicking the footer area toggles selection
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <div className="flex justify-between items-start mb-1">
          <h3
            className="font-semibold text-sm text-foreground truncate pr-2 cursor-pointer"
            title={data.name || "Creative"}
          >
            {data.name || "Untitled"}
          </h3>

          {/* Three-dot menu */}
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Don't trigger selection
                  setMenuOpen(true);
                }}
                className="shrink-0 h-6 w-6 flex items-center justify-center rounded-md text-subtle-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <MoreVert className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/creations/studio?edit=${data.id}`);
                }}
              >
                <Sparks className="w-4 h-4 text-primary" />
                Edit in Studio
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(data.id);
                  }}
                >
                  <Trash className="w-4 h-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between text-xs text-subtle-foreground">
          <span className="font-mono">{`${data.width || 0}×${data.height || 0}`}</span>
          {data.usageCount && data.usageCount > 0 && (
            <span className="flex items-center gap-1 text-primary font-medium">
              <GraphUp className="w-3 h-3" /> {data.usageCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
