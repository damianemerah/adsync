"use client";

import { useMemo } from "react";
import { Sparks, SystemRestart } from "iconoir-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useCreativeTemplates, type CreativeTemplate } from "@/hooks/use-creative-templates";

const CATEGORY_LABEL: Record<string, string> = {
  product_image: "Product Shots",
  social_ad: "Social Ads",
  poster: "Posters",
  ecommerce: "E-commerce",
};

function categoryLabel(key: string) {
  return CATEGORY_LABEL[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface TemplateGalleryProps {
  /** @deprecated No longer used — all templates are available to all subscribers */
  tierId?: "starter" | "growth" | "agency";
  /** Selected template id (for highlighting) */
  selectedId?: string | null;
  /** Called when a template is picked */
  onSelect: (template: CreativeTemplate) => void;
  /** @deprecated No longer used — all templates are available to all subscribers */
  onUpgradeRequired?: () => void;
  /** When set, only show this category and suppress category section headers */
  filterCategory?: string;
  className?: string;
}

export function TemplateGallery({
  selectedId,
  onSelect,
  filterCategory,
  className,
}: TemplateGalleryProps) {
  const { data: templates, isLoading, error } = useCreativeTemplates();

  const grouped = useMemo(() => {
    let list = templates ?? [];
    if (filterCategory && filterCategory !== "all") {
      list = list.filter((t) => t.category === filterCategory);
    }
    // When a filter is active, skip headers — return single flat group
    if (filterCategory !== undefined) {
      return [["", list]] as [string, CreativeTemplate[]][];
    }
    const map = new Map<string, CreativeTemplate[]>();
    for (const t of list) {
      const arr = map.get(t.category) ?? [];
      arr.push(t);
      map.set(t.category, arr);
    }
    return Array.from(map.entries());
  }, [templates, filterCategory]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <SystemRestart className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive py-6 text-center">
        Couldn&apos;t load templates. Please try again.
      </p>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-subtle-foreground">
        <Sparks className="h-6 w-6 text-primary" />
        <p className="text-sm">No templates available yet.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {grouped.map(([category, items]) => (
        <div key={category || "all"} className="space-y-3">
          {category && (
            <h3 className="text-xs font-bold uppercase tracking-wider text-subtle-foreground">
              {categoryLabel(category)}
            </h3>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((template) => {
              const isSelected = selectedId === template.id;

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onSelect(template)}
                  className={cn(
                    "group text-left rounded-lg border bg-card overflow-hidden transition-all relative",
                    isSelected
                      ? "border-2 border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="aspect-square bg-muted relative">
                    {template.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={template.thumbnail_url}
                        alt={template.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-subtle-foreground">
                        <Sparks className="h-8 w-8 opacity-40" />
                      </div>
                    )}
                    {template.is_premium && (
                      <Badge
                        className="absolute top-2 right-2 bg-ai/90 text-white border-0 text-[10px] font-bold"
                      >
                        Premium
                      </Badge>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {template.title}
                    </p>
                    {template.description && (
                      <p className="text-[11px] text-subtle-foreground line-clamp-2 mt-0.5">
                        {template.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
