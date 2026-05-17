"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Sparks } from "iconoir-react";
import { PageHeader } from "@/components/layout/page-header";
import { TemplateGallery } from "@/components/creatives/template-gallery";
import { PaymentDialog } from "@/components/billing/payment-dialog";
import { useSubscription } from "@/hooks/use-subscription";
import { useCreativeTemplates } from "@/hooks/use-creative-templates";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TierId } from "@/lib/constants";
import type { CreativeTemplate } from "@/hooks/use-creative-templates";

const CATEGORY_LABEL: Record<string, string> = {
  product_image: "Product Shots",
  social_ad: "Social Ads",
  poster: "Posters",
  ecommerce: "E-commerce",
};

function categoryLabel(key: string) {
  return (
    CATEGORY_LABEL[key] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export default function ImageTemplatesPage() {
  const router = useRouter();
  const { data: subscription } = useSubscription();
  const tierId = (subscription?.org?.tier as TierId | undefined) ?? "starter";
  const { data: templates } = useCreativeTemplates();

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const categories = useMemo(() => {
    if (!templates) return [];
    return Array.from(new Set(templates.map((t) => t.category)));
  }, [templates]);

  const handleSelect = (template: CreativeTemplate) => {
    router.push(`/ai-creative/image?templateId=${template.id}`);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/30 font-sans">
      <PageHeader title="Image Templates" showCredits className="z-30" />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 no-scrollbar">
        <div className="container max-w-6xl mx-auto space-y-6">
          

          {/* Category filter tabs */}
          <Tabs
            value={activeCategory}
            onValueChange={setActiveCategory}
            className="w-full"
          >
            <TabsList className="flex items-center gap-2 flex-wrap bg-transparent p-0 h-auto justify-start">
              <TabsTrigger
                value="all"
                className="flex-none px-4 py-1.5 rounded-full text-sm font-medium border transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=inactive]:bg-card data-[state=inactive]:text-subtle-foreground data-[state=inactive]:border-border hover:data-[state=inactive]:border-primary/50 hover:data-[state=inactive]:text-foreground"
              >
                All
              </TabsTrigger>
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="flex-none px-4 py-1.5 rounded-full text-sm font-medium border transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=inactive]:bg-card data-[state=inactive]:text-subtle-foreground data-[state=inactive]:border-border hover:data-[state=inactive]:border-primary/50 hover:data-[state=inactive]:text-foreground"
                >
                  {categoryLabel(cat)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Template grid */}
          <TemplateGallery
            tierId={tierId}
            filterCategory={activeCategory}
            onSelect={handleSelect}
            onUpgradeRequired={() => setUpgradeOpen(true)}
          />
        </div>
      </main>

      <PaymentDialog
        planId="growth"
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
      />
    </div>
  );
}
