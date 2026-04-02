"use server";

import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { fal } from "@fal-ai/client";
import { PromptParser } from "@/lib/ai/prompt-parser";
import probe from "probe-image-size";
import {
  FLUX_AD_GENERATOR_SYSTEM,
  FLUX_DIRECT_SYSTEM,
  FLUX_EDIT_SYSTEM,
  CreativeFormat,
} from "@/lib/ai/prompts";
import {
  compileContextPrompt,
  hasValidContext,
  type CampaignContext,
} from "@/lib/ai/context-compiler";
import { isPermanentCreativeUrl, isTempUploadUrl } from "@/lib/creative-utils";
import { requireCredits, spendCredits } from "@/lib/credits";
import { z } from "zod";
import { CREDIT_COSTS } from "@/lib/constants";
import { getActiveOrgId } from "@/lib/active-org";
import { resolveTier } from "@/lib/tier";
import { SKILL_IDS } from "@/lib/ai/service";

// Zod schema for AI-generated ad scene response
// SECURITY: Validates AI JSON responses before using them to prevent runtime errors
const AdSceneSchema = z.object({
  safety_flagged: z.boolean().optional(),
  ad_type: z.enum(["product_only", "lifestyle", "graphic"]).optional(),
  format: z.object({
    placement: z.enum(["social_feed", "story", "website", "ecommerce", "print"]).optional(),
    aspect_ratio: z.string().optional(),
    safe_zone_required: z.boolean().optional(),
  }).optional(),
  subject: z.object({
    type: z.enum(["physical_product", "service", "digital_product"]).optional(),
    name: z.string().optional(),
    primary_focus: z.string().optional(),
    secondary_elements: z.array(z.string()).optional(),
  }).optional(),
  scene: z.object({
    environment: z.string().optional(),
    location_context: z.string().optional(),
    time_of_day: z.string().optional(),
    mood: z.string().optional(),
    cultural_context: z.string().optional(),
  }).optional(),
  lighting: z.object({
    style: z.string().optional(),
    temperature_kelvin: z.number().optional(),
    direction: z.string().optional(),
  }).optional(),
  camera: z.object({
    required: z.boolean().optional(),
    angle: z.string().optional(),
    lens_mm: z.number().optional(),
    depth_of_field: z.string().optional(),
  }).optional(),
  text_overlay: z.object({
    exists: z.boolean().optional(),
    headline: z.string().optional(),
    subtext: z.string().optional(),
    cta: z.string().optional(),
    placement_hint: z.string().optional(),
    hierarchy: z.string().optional(),
  }).optional(),
  brand_tone: z.object({
    positioning: z.string().optional(),
    aesthetic: z.string().optional(),
    color_palette: z.array(z.string()).optional(),
    avoid: z.array(z.string()).optional(),
  }).optional(),
  constraints: z.object({
    product_isolated: z.boolean().optional(),
    no_humans: z.boolean().optional(),
    no_exaggerated_claims: z.boolean().optional(),
    high_resolution: z.boolean().optional(),
    ad_ready_quality: z.boolean().optional(),
  }).optional(),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  timeout: 15000,
  maxRetries: 1,
});

interface GenerateOptions {
  prompt: string;
  aspectRatio?: "1:1" | "9:16" | "4:5" | "16:9";
  mode: "raw" | "smart" | "template" | "refine";
  templateValues?: Record<string, string>;
  imageInput?: string;
  enhancePrompt?: boolean;
  seed?: number;
  imageIntent?: "edit" | "reference"; // [NEW]
  creativeFormat?: CreativeFormat; // [NEW]
}

// Helper: Check if image aspect ratio is compliant with ad standards
async function checkImageCompliance(url: string): Promise<boolean> {
  try {
    const result = await probe(url);
    const width = result.width;
    const height = result.height;
    const ratio = width / height;

    // Defines Allowed Ratios (with small tolerance)
    // 1:1 = 1.0
    // 4:5 = 0.8
    // 9:16 = 0.5625
    // 16:9 = 1.7778
    const ALLOWED_TARGETS = [1.0, 0.8, 0.5625, 1.7778];
    const TOLERANCE = 0.05;

    return ALLOWED_TARGETS.some(
      (target) => Math.abs(ratio - target) < TOLERANCE,
    );
  } catch (e) {
    console.error("Failed to probe image dimensions:", e);
    // If we can't verify, we fail safe -> ASSUME NON-COMPLIANT so we enforce safety.
    return false;
  }
}

export async function generateAdCreative({
  prompt,
  mode,
  templateValues,
  imageInput,
  imageInputs,
  enhancePrompt = true,
  currentCreativeId,
  seed,
  aspectRatio = "1:1", // Default to square
  imageIntent, // [NEW]
  parentCreativeId, // [NEW] Link to parent creative
  creativeFormat = "auto", // [NEW]
  campaignContext, // [NEW] Campaign context for auto-enrichment
}: GenerateOptions & {
  imageInputs?: string[];
  currentCreativeId?: string;
  parentCreativeId?: string; // [NEW]
  campaignContext?: CampaignContext; // [NEW]
}) {
  console.log(
    "🎨 Starting Generation\n",
    "Mode:",
    mode,
    "\n",
    "Format:",
    creativeFormat,
    "\n",
    "Ratio:",
    aspectRatio,
    "\n",
    "ImageInputs:",
    imageInputs,
    "\n",
    "ImageInput:",
    imageInput,
    "\n",
    "Intent:",
    imageIntent,
    "\n",
    "Prompt:",
    prompt,
    "\n",
    "Enhance:",
    enhancePrompt,
    "\n",
    "Seed:",
    seed,
    "\n",
    "Creative ID:",
    currentCreativeId,
    "\n",
    "Prompt:",
    prompt,
  );
  // 0. Config Check
  if (!process.env.FAL_KEY)
    throw new Error("Server Error: FAL_KEY is missing.");

  // 1. Resolve credit cost based on mode (edit is cheaper to encourage iteration)
  const isEditMode = mode === "refine";
  const creditCost = isEditMode
    ? CREDIT_COSTS.IMAGE_EDIT_PRO
    : CREDIT_COSTS.IMAGE_GEN_PRO;
  const creditReason = isEditMode
    ? "image_edit_flux_pro"
    : "image_gen_flux_pro";
  const creditModel = isEditMode
    ? "fal-ai/flux-2-pro/edit"
    : "fal-ai/flux-2-pro";

  // 2. Auth + subscription + credit gate (throws with user-facing message on failure)
  const supabase = await createClient();
  const { orgId, userId } = await requireCredits(supabase, creditCost);

  // 3. Safety Check: Moderation is now integrated directly into the FLUX_AD_GENERATOR_SYSTEM call.
  // Exceptions will be thrown when we parse the generated schema if safety_flagged is true.

  // 4. Auth user object for downstream use
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 4b. Resolve tier — determines whether to use image-creative-ng skill (Growth/Agency)
  // or fall back to the JSON→compile approach (Starter).
  const { config: tierConfig } = await resolveTier(supabase, user.id);
  const useImageSkill = tierConfig.ai.useSkills;

  // --- PROMPT ENGINEERING ---
  let finalPrompt = prompt;

  const imageContext =
    imageInputs && imageInputs.length > 0
      ? `\n\nSYSTEM NOTE: The user provided ${imageInputs.length} reference images. Refer to them strictly as @image1, @image2, etc.`
      : "";

  // Resolve Template if needed
  if (mode === "template") {
    try {
      const { data: template } = await supabase
        .from("creative_templates")
        .select("prompt_template")
        .eq("id", prompt)
        .single();

      if (template) {
        finalPrompt = PromptParser.fill(
          template.prompt_template,
          templateValues || {},
        );
      }
    } catch (e) {
      console.warn("Template resolution failed, falling back to raw prompt", e);
    }
  }

  // --- CONTEXT ENRICHMENT (NEW) ---
  // If campaign context is available and not in raw mode, enrich the prompt
  // This solves the underprompting issue by auto-adding targeting, location, and copy
  if (hasValidContext(campaignContext) && mode !== "raw" && !isEditMode) {
    try {
      const contextEnrichedPrompt = compileContextPrompt(
        finalPrompt,
        campaignContext!,
        creativeFormat,
        aspectRatio,
      );

      // Use context-enriched prompt as the base for further AI processing
      finalPrompt = contextEnrichedPrompt;
    } catch (contextError) {
      console.warn(
        "Context enrichment failed, using original prompt:",
        contextError,
      );
      // Fallback: continue with original prompt
    }
  }

  let promptGenerationUsage: any = null;

  try {
    if (mode === "raw") {
      // Pass through
      console.log("Raw mode: skipping AI enhancement");
    } else if (isEditMode) {
      // --- EDIT FLOW (String Output) ---
      // Use FLUX_EDIT_SYSTEM to generate instructions
      const systemPrompt = FLUX_EDIT_SYSTEM + imageContext;

      console.log("\n====================================");
      console.log(
        "🤖 [OpenAI Images] Calling responses.create (gpt-5-mini) for image edit instruction...",
      );
      console.log("📝 [OpenAI Images] systemPrompt:", systemPrompt);
      console.log("📝 [OpenAI Images] finalPrompt:", finalPrompt);

      const completion = await (openai.responses.create as any)({
        model: "gpt-5-mini",
        instructions: systemPrompt,
        input: finalPrompt,
      });

      console.log(
        "✅ [OpenAI Images] Edit instruction generated successfully.",
        completion,
      );
      console.log("====================================\n");

      promptGenerationUsage = completion.usage || null;

      if (completion.output_text) {
        finalPrompt = completion.output_text.trim();
      }
    } else {
      console.log("Finalprompt before AI: ", finalPrompt);
      // --- GENERATION FLOW ---
      // Growth/Agency: image-creative-ng skill → direct FLUX prompt string (better quality)
      // Starter: JSON schema → compileFluxPrompt() → FLUX string (fallback)

      const formatMapping: Record<string, any> = {
        social_ad: {
          ad_type: "lifestyle",
          format: { placement: "social_feed", aspect_ratio: aspectRatio },
        },
        product_image: {
          ad_type: "product_only",
          format: { placement: "ecommerce", aspect_ratio: "1:1" },
          text_overlay: { exists: false },
          constraints: { product_isolated: true },
        },
        poster: {
          ad_type: "graphic",
          format: { placement: "social_feed", aspect_ratio: "4:5" },
        },
        auto: {},
      };

      const mappedContext =
        creativeFormat && creativeFormat !== "auto"
          ? formatMapping[creativeFormat]
          : {};

      const userMessage = `
        Context: ${imageContext}
        Request: ${finalPrompt}
        FormatIntent: ${JSON.stringify(mappedContext)}
        AspectRatio: ${aspectRatio}
      `.trim();

      console.log("\n====================================");
      console.log(`🤖 [OpenAI Images] Generation — skill: ${useImageSkill}`);
      console.log("📝 [OpenAI Images] userMessage:\n", userMessage);

      // if (useImageSkill) {
      //   console.log("Using skill path");
      //   // ── Skill path (Growth/Agency): direct FLUX prompt string ──────────
      //   const completion = await (openai.responses.create as any)({
      //     model: "gpt-5.2",
      //     instructions: FLUX_DIRECT_SYSTEM,
      //     input: userMessage,
      //     tools: [
      //       {
      //         type: "shell",
      //         environment: {
      //           type: "container_auto",
      //           skills: [
      //             { type: "skill_reference", skill_id: SKILL_IDS.imageCreative },
      //           ],
      //         },
      //       },
      //     ],
      //   });
      //   console.log("✔️✔️Completion: ", completion);

      //   console.log("====================================\n");
      //   promptGenerationUsage = completion.usage || null;

      //   if (completion.output_text) {
      //     const raw = completion.output_text.trim();
      //     if (raw.startsWith("SAFE_FLAG:")) {
      //       throw new Error("Your prompt contains unsafe content. Please revise.");
      //     }
      //     finalPrompt = raw;
      //     console.log("🧠 Skill-Generated Prompt:", finalPrompt);
      //   }
      //   console.log("Finalprompt after AI: ", finalPrompt);
      // } else {
      //   // ── Starter path: JSON schema → compile ────────────────────────────
      //   const completion = await (openai.responses.create as any)({
      //     model: "gpt-5.2",
      //     instructions: FLUX_AD_GENERATOR_SYSTEM,
      //     input: userMessage,
      //   });

      //   console.log("✔️✔️Completion:22 ", completion.output_text);

      //   console.log("====================================\n");
      //   promptGenerationUsage = completion.usage || null;

      //   if (completion.output_text) {
      //     const rawJson = completion.output_text
      //       .replace(/```json\n?/g, "")
      //       .replace(/```\n?/g, "")
      //       .trim();

      //     // SECURITY FIX: Use Zod to validate AI JSON response before using it
      //     // Prevents runtime errors from malformed AI responses
      //     let jsonResponse;
      //     try {
      //       const parsed = JSON.parse(rawJson);
      //       jsonResponse = AdSceneSchema.parse(parsed);
      //     } catch (validationError: any) {
      //       console.error("AI response validation failed:", validationError.message);
      //       // Fallback: use raw prompt if schema validation fails
      //       console.warn("Falling back to raw prompt due to schema validation failure");
      //       finalPrompt = userMessage;
      //       // Don't throw - degrade gracefully
      //       return; // Skip the compilation step
      //     }

      //     if (jsonResponse.safety_flagged) {
      //       throw new Error("Your prompt contains unsafe content. Please revise.");
      //     }

      //     const { compileFluxPrompt } = await import("@/lib/ai/compiler");
      //     // Cast to the expected type - the AI should return all required fields
      //     // but Zod schema makes them optional for safety
      //     finalPrompt = compileFluxPrompt(jsonResponse as any, aspectRatio || "1:1");
      //     console.log("🧠 Compiled Prompt:", finalPrompt);
      //   }
      // }
    }
  } catch (error) {
    console.error("Prompt Engineering Failed:", error);
    // Fallback: finalPrompt stays as is
  }

  // --- IMAGE GENERATION ---
  try {
    fal.config({ credentials: process.env.FAL_KEY });

    const usedSeed = seed ?? Math.floor(Math.random() * 10000000);
    const referenceImages = imageInputs || (imageInput ? [imageInput] : []);
    const hasImages = referenceImages.length > 0;

    // [FIXED] Robust Aspect Ratio Mapping
    // Flux 2 Pro allows {width, height} for exact control
    let targetImageSize: any = "square_hd";

    switch (aspectRatio) {
      case "1:1":
        targetImageSize = "square_hd"; // 1024x1024
        break;
      case "16:9":
        targetImageSize = "landscape_16_9"; // 1344x768 (approx)
        break;
      case "9:16":
        targetImageSize = "portrait_16_9"; // 768x1344 (approx)
        break;
      case "4:5":
        // Custom size for 4:5 (Standard Social Media Portrait)
        // 1024 width -> 1280 height. Both are multiples of 16.
        targetImageSize = { width: 1024, height: 1280 };
        break;
      default:
        targetImageSize = "square_hd";
    }

    // Determine Model
    const useEditModel = mode === "refine" || hasImages;
    const modelId = useEditModel
      ? "fal-ai/flux-2-pro/edit"
      : "fal-ai/flux-2-pro";

    let inputArgs: any = {
      prompt: finalPrompt,
      seed: usedSeed,
    };

    if (useEditModel) {
      if (!hasImages) throw new Error("Refine mode requires input images.");

      // --- AD COMPLIANCE LOGIC ---
      let finalImageSize = "auto";

      if (imageIntent === "reference") {
        // Intent: "Create New using Reference" -> STRICT ENFORCEMENT
        console.log(
          "🛡️ AdCompliance: Reference Mode -> Enforcing Target Ratio",
          targetImageSize,
        );
        finalImageSize = targetImageSize;
      } else {
        // Intent: "Edit" (Default) -> ASSISTIVE
        // Check if valid.
        const mainImage = referenceImages[0];
        const isCompliant = await checkImageCompliance(mainImage);

        if (isCompliant) {
          console.log(
            "🛡️ AdCompliance: Edit Mode -> Valid Ratio -> Preserving",
          );
          finalImageSize = "auto";
        } else {
          console.log(
            "🛡️ AdCompliance: Edit Mode -> Invalid Ratio -> Normalizing to",
            targetImageSize,
          );
          // Normalize to user selection or default since input is invalid
          finalImageSize = targetImageSize;
        }
      }

      inputArgs = {
        ...inputArgs,
        image_urls: referenceImages,
        image_size: finalImageSize,
        safety_tolerance: "5",
        output_format: "jpeg",
        sync_mode: true,
      };
    } else {
      console.log("Standard Generation with upsampling");
      inputArgs = {
        ...inputArgs,
        image_size: targetImageSize,
        safety_tolerance: "2",
      };
    }

    console.log(`🚀 Sending to Fal [${modelId}]`, {
      image_size: targetImageSize,
      imageIntent,
    });
    console.log("Input Args:🚀", inputArgs.prompt);

    const result: any = await fal.subscribe(modelId, {
      input: inputArgs,
      logs: true,
    });

    const images = result.data?.images || result.images;

    if (!images || !images[0]) {
      throw new Error("AI generated nothing. Please try again.");
    }

    const imageUrl = images[0].url;

    // ── Deduct credits immediately after successful generation ──────────────
    // We deduct AFTER the AI call succeeds so users are never charged for
    // failed generations. creativeId is not yet known at this point (null).
    await spendCredits(
      supabase,
      orgId,
      userId,
      creditCost,
      creditReason,
      null,
      creditModel,
    );

    // 5. Log request (no auto-persist — images are ephemeral previews)
    try {
      const { error } = await supabase.from("ai_requests").insert({
        user_id: user.id,
        request_type: mode === "refine" ? "image_edit" : "image_generation",
        input_json: {
          original_prompt: prompt,
          final_prompt: finalPrompt,
          mode,
          model_id: modelId,
          fal_input: {
            ...inputArgs,
            image_urls: inputArgs.image_urls
              ? "[REDACTED_LENGTH: " + inputArgs.image_urls.length + "]"
              : undefined,
          },
          creative_format: creativeFormat,
          used_context: hasValidContext(campaignContext),
          context_source: campaignContext ? "campaign" : "raw",
        },
        result_json: {
          image_url: imageUrl,
          fal_request_id: result.requestId,
          fal_metrics: result.metrics || null,
          credit_cost: creditCost,
          prompt_generation_usage: promptGenerationUsage,
        },
        tokens_used: promptGenerationUsage?.total_tokens || 0,
        organization_id: orgId,
      });

      if (error) {
        console.error("Failed to log AI request:", error);
      }
    } catch (logError) {
      console.error("Failed to log AI request:", logError);
    }

    // Clean up any ephemeral temp-upload URLs used as references (fire-and-forget)
    const referenceUrls = imageInputs || (imageInput ? [imageInput] : []);
    if (referenceUrls.length > 0) {
      cleanupTempUploads(referenceUrls).catch(() => {});
    }

    return {
      imageUrl,
      usedPrompt: finalPrompt,
      seed: result.data?.seed || result.seed,
    };
  } catch (error: any) {
    console.error("Fal API Error:", error);
    if (error.status === 403 || error.message?.includes("403")) {
      throw new Error("Server configuration error (API Key). Contact support.");
    }
    throw new Error(error.message || "Failed to generate image.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// stashGeneratedImage
//
// After fal.ai returns an ephemeral CDN URL, upload it to the temp-uploads
// bucket so it survives step-navigation and page reloads WITHOUT creating a
// DB row in `creatives`. The image only graduates to `creatives` when the
// user explicitly clicks "Use This" / "Use in Campaign" / "Save to Library".
//
// Mirrors uploadTempImage but pulls from a URL instead of a browser File.
// ─────────────────────────────────────────────────────────────────────────────
export async function stashGeneratedImage(falUrl: string): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

  const imageRes = await fetch(falUrl);
  if (!imageRes.ok)
    throw new Error("Could not fetch generated image from AI provider.");
  const buffer = Buffer.from(await imageRes.arrayBuffer());

  // Store under a `generated/` prefix so it's easy to distinguish from
  // user-uploaded reference images and easy to bulk-clean with a cron.
  const filePath = `${orgId}/generated/${Date.now()}_${Math.random().toString(36).slice(2)}.jpeg`;

  const { error } = await supabase.storage
    .from("temp-uploads")
    .upload(filePath, buffer, { contentType: "image/jpeg" });

  if (error) throw new Error("Failed to stash generated image.");

  const {
    data: { publicUrl },
  } = supabase.storage.from("temp-uploads").getPublicUrl(filePath);

  return publicUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// saveCreativeToLibrary
//
// Promote an image (temp-uploads URL OR fal URL) to the permanent `creatives`
// bucket and create the DB row. Safe to call multiple times on the same
// permanent URL — if the URL is already in the creatives bucket it returns
// the existing record instead of re-uploading.
// ─────────────────────────────────────────────────────────────────────────────
export async function saveCreativeToLibrary({
  imageUrl,
  prompt,
  aspectRatio = "1:1",
  parentCreativeId,
}: {
  imageUrl: string;
  prompt: string;
  aspectRatio?: "1:1" | "9:16" | "4:5" | "16:9";
  parentCreativeId?: string;
}): Promise<{ creativeId: string; publicUrl: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

  // ── Dedup guard ──────────────────────────────────────────────────────────────────
  // If the URL already points to the permanent creatives bucket, look up the
  // existing DB row and return it — no re-upload, no duplicate row.
  if (isPermanentCreativeUrl(imageUrl)) {
    const { data: existing } = await supabase
      .from("creatives")
      .select("id, original_url")
      .eq("original_url", imageUrl)
      .eq("organization_id", orgId as string)
      .single();

    if (existing) {
      return { creativeId: existing.id, publicUrl: existing.original_url };
    }
    // URL is in the right bucket but no DB row — fall through to re-insert
    // (shouldn't happen in normal flow, but safe to handle).
  }

  // 1. Fetch the image from its current location (temp-uploads or fal CDN)
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok)
    throw new Error(
      "Failed to fetch image — it may have expired. Please regenerate.",
    );
  const imageBuffer = await imageRes.arrayBuffer();
  const buffer = Buffer.from(imageBuffer);

  // 2. Upload to permanent storage
  const filePath = `${orgId}/${Date.now()}_ai_gen.jpeg`;
  const { error: uploadError } = await supabase.storage
    .from("creatives")
    .upload(filePath, buffer, { contentType: "image/jpeg" });

  if (uploadError) throw new Error("Failed to save image to storage.");

  const {
    data: { publicUrl },
  } = supabase.storage.from("creatives").getPublicUrl(filePath);

  // 3. Resolve pixel dimensions for the chosen aspect ratio
  const ASPECT_DIMENSIONS: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "16:9": { width: 1344, height: 768 },
    "9:16": { width: 768, height: 1344 },
    "4:5": { width: 1024, height: 1280 },
  };

  const dims = ASPECT_DIMENSIONS[aspectRatio] || { width: 1024, height: 1024 };

  // 4. Insert DB row using shared saveCreative action (prevents RLS bypass)
  const { saveCreative } = await import("@/actions/creatives");
  const result = await saveCreative({
    originalUrl: publicUrl,
    width: dims.width,
    height: dims.height,
    format: "image/jpeg",
    generationParams: {
      prompt,
      aspectRatio,
      parentCreativeId: parentCreativeId || null,
    },
  });

  if (!result.success || !result.creative) {
    throw new Error("Failed to save creative to database.");
  }

  const creativeData = result.creative;

  // Clean up temp stash now that the image has a permanent home.
  // Fire-and-forget — failure here doesn't affect the caller.
  if (isTempUploadUrl(imageUrl)) {
    cleanupTempUploads([imageUrl]).catch(() => {});
  }

  return { creativeId: creativeData.id, publicUrl };
}

// [NEW] Action to retrieve history for editing or refine variations
export async function getCreativeHistory(creativeId: string) {
  const supabase = await createClient();

  // Scope all queries to the caller's organization so no cross-org data leaks.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

  // 1. Get the target creative — scoped to this org
  const { data: creative, error: creativeError } = await supabase
    .from("creatives")
    .select("parent_id, id")
    .eq("id", creativeId)
    .eq("organization_id", orgId) // 🔒 org scope guard
    .single();

  if (creativeError || !creative) {
    console.error("Creative search failed:", creativeId);
    return null;
  }

  // 2. Determine the "Root" ID
  // If parent_id exists, this is a child. Root is parent_id.
  // If parent_id is null, this is the root.
  const rootId = creative.parent_id || creative.id;

  // 3. Fetch ALL creatives in this family (Root + Children) — org-scoped
  const { data: family } = await supabase
    .from("creatives")
    .select("id, original_url, created_at, generation_prompt, parent_id")
    .eq("organization_id", orgId) // 🔒 org scope guard
    .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
    .order("created_at", { ascending: true }); // Oldest (Root) first

  // 4. Find the specific AI request for the CURRENT creative (to return prompt/seed)
  // We want the parameters used to generate *this specific version*
  const { data: specificRequest } = await supabase
    .from("ai_requests")
    .select("input_json")
    .eq("creative_id", creativeId)
    .maybeSingle();

  // Extract Prompt & Seed
  let prompt = "";
  let seed = undefined;

  if (specificRequest?.input_json) {
    const input = specificRequest.input_json as any;
    prompt = input.final_prompt || input.original_prompt || "";
    seed = input.fal_input?.seed;
  } else if (family) {
    // Fallback: Try to find prompt from the creative table itself (if added there)
    const currentItem = family.find((f) => f.id === creativeId);
    if (currentItem?.generation_prompt) {
      prompt = currentItem.generation_prompt;
    }
  }

  return {
    prompt,
    seed,
    history:
      family?.map((f) => ({
        id: f.id,
        imageUrl: f.original_url,
        isRoot: !f.parent_id,
      })) || [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// uploadTempImage
//
// Uploads a file to the ephemeral `temp-uploads` bucket for use as a
// reference image during generation. No DB row is created — the file
// auto-cleans up after 1 hour and is also cleaned inline after generation.
// Returns the public URL that can be passed to Fal.
// ─────────────────────────────────────────────────────────────────────────────
export async function uploadTempImage(formData: FormData): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const fileExt = file.name.split(".").pop() || "png";
  const filePath = `${orgId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from("temp-uploads")
    .upload(filePath, buffer, {
      contentType: file.type || "image/png",
    });

  if (uploadError) {
    console.error("[uploadTempImage] Upload failed:", uploadError);
    throw new Error(`Failed to upload image. Please try again. (${uploadError.message || "Unknown error"})`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("temp-uploads").getPublicUrl(filePath);

  return publicUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// cleanupTempUploads
//
// Fire-and-forget helper that deletes temp-upload files by their public URLs.
// Called after generation completes so ephemeral images don't linger.
// ─────────────────────────────────────────────────────────────────────────────
export async function cleanupTempUploads(publicUrls: string[]): Promise<void> {
  if (!publicUrls.length) return;

  const supabase = await createClient();
  const bucketSegment = "/storage/v1/object/public/temp-uploads/";

  const filePaths = publicUrls
    .filter((url) => url.includes(bucketSegment))
    .map((url) => url.split(bucketSegment)[1])
    .filter(Boolean);

  if (filePaths.length === 0) return;

  const { error } = await supabase.storage
    .from("temp-uploads")
    .remove(filePaths);

  if (error) {
    console.error("[cleanupTempUploads] Cleanup failed:", error);
  } else {
    console.log(
      `[cleanupTempUploads] Cleaned ${filePaths.length} temp file(s)`,
    );
  }
}
