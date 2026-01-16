import Image from "next/image";
import { Checkbox } from "../ui/checkbox";
import { MoreVertical, TrendingUp, Play } from "lucide-react";
import { Creative } from "@/types";

export function CreativeCard({
  data,
  selected,
  onSelect,
  onClick,
}: {
  data: Creative;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className={`group relative bg-white rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${
        selected ? "ring-2 ring-blue-600 border-blue-600" : "border-slate-200"
      }`}
      onClick={onSelect}
    >
      <div className="aspect-square relative bg-slate-100 cursor-pointer">
        <Image
          src={data.original_url}
          alt={data.name || "Creative"}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          onClick={onClick}
        />
        {data.media_type === "video" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
            <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-current" />
            </div>
          </div>
        )}
        {data.isLive && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />{" "}
            Live
          </div>
        )}
      </div>
      <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Checkbox
          checked={selected}
          onCheckedChange={onSelect}
          className="h-6 w-6 rounded-md border-white/50 bg-black/40 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
        />
      </div>
      <div className="p-3">
        <div className="flex justify-between items-start mb-1">
          <h3
            className="font-semibold text-sm text-slate-900 truncate pr-2"
            title={data.name || "Creative"}
          >
            {data.name || "Untitled"}
          </h3>
          <MoreVertical className="h-4 w-4 text-slate-400 cursor-pointer hover:text-slate-600" />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono">{`${data.width || 0}x${
            data.height || 0
          }`}</span>
          {data.usageCount && data.usageCount > 0 && (
            <span className="flex items-center gap-1 text-blue-600 font-medium">
              <TrendingUp className="w-3 h-3" /> {data.usageCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
