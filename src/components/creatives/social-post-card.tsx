import { Badge } from "@/components/ui/badge";
import { CheckCircle, Heart, Instagram, ChatBubble } from "iconoir-react";
import Image from "next/image";

export function SocialPostCard({
  post,
  selected,
  onSelect,
  onClick,
}: {
  post: any;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group relative bg-white rounded-lg border shadow-sm border border-border cursor-pointer hover:shadow-sm border border-border transition-all ${
        selected ? "ring-2 ring-primary border-primary" : "border-border"
      }`}
    >
      <div className="p-3 flex items-center gap-2 border-b border-slate-50">
        {post.platform === "instagram" ? (
          <Instagram className="w-4 h-4 text-pink-600" />
        ) : (
          <div className="w-4 h-4 bg-black text-white rounded-full flex items-center justify-center text-[8px] font-bold">
            Tk
          </div>
        )}
        <span className="text-xs font-medium text-slate-500 capitalize">
          {post.platform}
        </span>
        <span className="ml-auto text-[10px] text-slate-400">
          {post.postedAt}
        </span>
      </div>
      <div className="aspect-4/5 relative bg-slate-100 overflow-hidden">
        <Image
          src={post.thumbnail}
          alt={post.caption}
          fill
          className="h-full w-full object-cover"
          onClick={onClick}
        />
        <div className="absolute bottom-0 inset-x-0 p-3 bg-linear-to-t from-black/80 to-transparent text-white flex justify-between items-end">
          <div className="flex gap-3">
            <span className="flex items-center gap-1 text-xs font-medium">
              <Heart className="w-3.5 h-3.5 fill-white" /> {post.likes}
            </span>
            <span className="flex items-center gap-1 text-xs font-medium">
              <ChatBubble className="w-3.5 h-3.5" /> {post.comments}
            </span>
          </div>
        </div>
        {selected && (
          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px]">
            <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-border">
              <CheckCircle className="w-6 h-6 text-primary" />
            </div>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
          {post.caption}
        </p>
        {post.status === "active_ad" && (
          <Badge className="mt-2 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 border text-[10px] px-2 h-5 shadow-none">
            Running
          </Badge>
        )}
      </div>
    </div>
  );
}
