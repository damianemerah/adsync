import { use } from "react";
import { GenerationView } from "@/components/creatives/studio/generation-view";
import { Sparks } from "iconoir-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "next/navigation";
import { useCreativeEditor } from "@/hooks/use-creative-editor";

interface EditCreativePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditCreativePage({ params }: EditCreativePageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  const {
    isLoading,
    campaignName,
    generatedImage,
    prompt,
    aspectRatio,
    seed,
    generationHistory,
    handleRefine,
    handleSave,
    handleUseInCampaign,
    handleBack,
  } = useCreativeEditor(id);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-muted">
        <div className="space-y-4 w-full max-w-2xl p-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-muted/30">
      <PageHeader
        title="Edit Creative"
        showCredits
        className="z-30"
        leftContent={
          campaignName ? (
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1.5 font-sans">
              <Sparks className="h-3 w-3" />
              {campaignName.slice(0, 25)}
              {campaignName.length > 25 ? "..." : ""}
            </Badge>
          ) : null
        }
      />
      <div className="flex-1 min-h-0">
        <GenerationView
          initialImage={generatedImage || ""}
          initialPrompt={prompt}
          onBack={handleBack}
          onRefine={handleRefine}
          onSave={handleSave}
          aspectRatio={aspectRatio}
          seed={seed}
          history={generationHistory}
          onUseInCampaign={returnTo ? handleUseInCampaign : undefined}
        />
      </div>
    </div>
  );
}
