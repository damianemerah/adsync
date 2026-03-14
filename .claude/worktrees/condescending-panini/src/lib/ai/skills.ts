export const IMAGE_PROMPT_SKILL = {
  name: "generate_image_prompt",
  description:
    "Generates a detailed photorealistic image prompting strategy based on a simple product description.",
  parameters: {
    type: "object",
    properties: {
      subject: {
        type: "string",
        description: "The core product focus (e.g. 'A sleek red sneaker').",
      },
      environment: {
        type: "string",
        description:
          "The background setting (e.g. 'Concrete urban street', 'Marble kitchen counter').",
      },
      lighting: {
        type: "string",
        description:
          "Lighting mood (e.g. 'Soft cinematic window light', 'Neon cyberpunk glow').",
      },
      camera_angle: {
        type: "string",
        description:
          "Best angle for the ad (e.g. 'Eye-level close up', 'Top-down flatlay').",
      },
      style_keywords: {
        type: "string",
        description:
          "Technical keywords for Flux (e.g. '8k, highly detailed, commercial photography, depth of field').",
      },
    },
    required: [
      "subject",
      "environment",
      "lighting",
      "camera_angle",
      "style_keywords",
    ],
  },
};
