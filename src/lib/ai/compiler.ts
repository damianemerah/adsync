export interface AdSceneSchema {
  ad_type: "product_only" | "lifestyle" | "graphic";
  format: {
    placement: "social_feed" | "story" | "website" | "ecommerce" | "print";
    aspect_ratio: string;
    safe_zone_required: boolean;
  };
  subject: {
    type: "physical_product" | "service" | "digital_product";
    name: string;
    primary_focus: string;
    secondary_elements: string[];
  };
  scene: {
    environment: string;
    location_context: string;
    time_of_day: string;
    mood: string;
    cultural_context: string;
  };
  lighting: {
    style: string;
    temperature_kelvin: number;
    direction: string;
  };
  camera?: {
    required: boolean;
    angle: string;
    lens_mm: number;
    depth_of_field: string;
  };
  text_overlay?: {
    exists: boolean;
    headline?: string;
    subtext?: string;
    cta?: string;
    placement_hint?: string;
    hierarchy?: string;
  };
  brand_tone: {
    positioning: string;
    aesthetic: string;
    color_palette: string[];
    avoid: string[];
  };
  constraints: {
    product_isolated?: boolean;
    no_humans?: boolean;         // legacy — use product_isolated
    no_exaggerated_claims: boolean;
    high_resolution: boolean;
    ad_ready_quality: boolean;
  };
}

export function compileFluxPrompt(
  schema: AdSceneSchema,
  aspectRatio: string,
): string {
  // 1. Base Logic: Subject & Focus
  // "Professional commercial photography of [Subject Focus] [Subject Name]"
  let prompt = `Professional commercial photography of ${schema.subject.primary_focus}`;
  if (schema.subject.name) prompt += ` (${schema.subject.name})`;
  prompt += ". ";

  // 2. Action / Scene / Environment
  prompt += `${schema.scene.environment}, ${schema.scene.location_context}. `;
  if (schema.scene.time_of_day)
    prompt += `${schema.scene.time_of_day} lighting. `;

  // 3. Technical Anchors (Lighting & Camera)
  prompt += `Lighting: ${schema.lighting.style}, ${schema.lighting.direction} (${schema.lighting.temperature_kelvin}K). `;

  if (schema.camera && schema.camera.required) {
    prompt += `Camera: Shot on ${schema.camera.lens_mm}mm lens, ${schema.camera.angle}, ${schema.camera.depth_of_field} depth of field. `;
  }

  // 4. Mood & Tone & Style
  prompt += `Mood: ${schema.scene.mood}, ${schema.brand_tone.aesthetic}, ${schema.brand_tone.positioning}. `;
  prompt += "High resolution, 8k, sharp focus. "; // Default quality boosters

  // 5. Text Handling
  if (schema.text_overlay?.exists && schema.text_overlay.headline) {
    prompt += `Includes text overlay: "${schema.text_overlay.headline}"`;
    if (schema.text_overlay.subtext)
      prompt += ` - "${schema.text_overlay.subtext}"`;

    if (schema.text_overlay.placement_hint) {
      prompt += ` located at ${schema.text_overlay.placement_hint.replace("_", " ")}`;
    }

    prompt += ". Typography: Modern, bold, legible. ";
  }

  // 6. Product isolation — described positively (FLUX does not support negative prompting)
  if ((schema.constraints as any).product_isolated || (schema.constraints as any).no_humans) {
    prompt += "Product isolated on studio surface, sole focal point, clean composition. ";
  }

  // 7. Aspect Ratio / Format Hints
  // If graphic ad, emphasize layout
  if (schema.ad_type === "graphic") {
    prompt += "Graphic design layout, flat lay or poster style composition. ";
  }

  if (schema.format.placement === "social_feed") {
    prompt += "Optimized for social media feed, central focal point. ";
  } else if (schema.format.placement === "story") {
    prompt += "Vertical composition with safe zones for UI. ";
  }

  return prompt.trim();
}
