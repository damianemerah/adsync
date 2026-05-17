import { ImageCreatorClient } from "./image-creator-client";

export default async function ImageCreatorPage({
  searchParams,
}: {
  searchParams: Promise<{ templateId?: string }>;
}) {
  const { templateId } = await searchParams;
  return <ImageCreatorClient templateId={templateId ?? null} />;
}
