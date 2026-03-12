---
name: openai-api
description: Source of truth and coding guidelines for building with the OpenAI API (Responses API, Tool Use, Agent Skills, Caching, Structured Outputs).
---

# OpenAI API Integration Guidelines

This skill defines the source of truth for developing with the OpenAI API inside AdSync, specifically focusing on the advanced Responses API (`openai.responses.create`), Structured Outputs, Tool Use, and the Agent Skills (`/v1/skills`) integrations. ALWAYS reference this skill when building or fixing OpenAI-related features.

**Important Instruction for Agents:** If you are unsure about any syntax or you lack full context during an implementation involving OpenAI, **you MUST explicitly read these documentation links using your tools before writing code**:

- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs)
- [Tools and Skills Guide](https://developers.openai.com/api/docs/guides/tools-skills)
- [Prompt Caching Guide](https://developers.openai.com/api/docs/guides/prompt-caching)
- Internal AdSync Reference: `src/lib/ai/service.ts`

## 1. Using the Responses API

When generating AI strategies or invoking complex agentic workflows, use the experimental `responses.create` endpoint on the OpenAI client (which is cast to `any` depending on the current SDK typings).

```typescript
// Example usage in the OpenAI client:
const response = await (openai.responses.create as any)({
  model: "gpt-5.2", // or "gpt-4.1-mini" for faster/iterative tasks
  instructions: "System prompt instructions go here...",
  input: "User context / message goes here...",
  tools: [
    {
      type: "shell",
      environment: {
        type: "container_auto",
        skills: buildSkillList(),
      },
    },
  ],
  text: {
    format: {
      type: "json_schema",
      name: "schema_name",
      schema: YOUR_JSON_SCHEMA,
    },
  },
});

// The generated text is guaranteed to match the schema
// Parse it directly from output_text
const parsedResult = JSON.parse(response.output_text);
```

## 2. Using Agent Skills

Agent Skills are defined within the `tools` parameter under a `shell` environment. Skills are uploaded to the `/v1/skills` endpoint and referenced by their `skill_id`.

```typescript
function buildSkillList() {
  return [
    {
      type: "skill_reference",
      skill_id: process.env.SKILL_ID_CORE_STRATEGY_NG,
    },
    { type: "skill_reference", skill_id: process.env.SKILL_ID_COPY_FASHION_NG },
    // ...other skills
  ];
}
```

**Uploading Skills:**
Skills are managed via the `src/scripts/upload-skills.ts` script. The script reads directories from `src/lib/ai/skill-definitions/`, uploads them to OpenAI, and generates the required `.env` variables (e.g., `SKILL_ID_CORE_STRATEGY_NG`). You MUST run this script if you modify any `.md` definitions.

## 3. Structured Outputs (JSON Schema)

We use OpenAI's Strict Structured Outputs feature by passing a JSON schema in the `text.format` block of the `responses.create` call.

- Use `"type": "json_schema"`.
- Provide the exact schema shape in the `schema` property.
- Set `additionalProperties: false` on objects to ensure strict adherence.
- Make sure every key in `properties` is listed in the `required` array.

Because the API guarantees JSON output matching your schema, you do not need to manually parse out markdown code blocks or handle JSON parse errors.

## 4. Prompt Caching

With OpenAI, prompt caching is handled completely automatically for prompts over 1,024 tokens.

- **How it works:** The API automatically caches and hits the cache for static prefixes, saving costs and latency.
- **Best Practice:** Place static content (like system instructions, large uploaded tool schemas, or documentation) at the _beginning_ of the prompt context.
- Keep dynamic, uniquely varied context (like the precise user query) at the _very end_ of your request.
- You do _not_ need explicit `cache_control` headers.

## 5. GPT-4o Vision — vision-analyzer.ts (Phase 3 Planned)

The Phase 3 `analyze-assets` cron uses `gpt-4o` with vision to extract winning creative
traits from high-performing campaign images. This is **separate** from the Responses API
workflow above — it uses the Chat Completions endpoint because vision lives there.

### File: src/lib/ai/vision-analyzer.ts (Phase 3 — Not Yet Built)

```typescript
// Pattern for vision-based ad creative analysis
const response = await openai.chat.completions.create({
  model: "gpt-4o",  // Use gpt-4o for vision, not gpt-5.2
  messages: [
    {
      role: "system",
      content:
        "You are an expert Nigerian digital marketing creative analyst. " +
        "Analyse this ad image and extract visual traits that drove performance.",
    },
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: imageUrl }, // Supabase Storage public URL
        },
        {
          type: "text",
          text: "Analyse this ad creative and extract its visual traits as JSON.",
        },
      ],
    },
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "ad_creative_analysis",
      strict: true,
      schema: {
        type: "object",
        properties: {
          successful_patterns: { type: "array", items: { type: "string" } },
          color_palette:       { type: "array", items: { type: "string" } },
          visual_themes:       { type: "array", items: { type: "string" } },
          copy_hooks:          { type: "array", items: { type: "string" } },
        },
        required: ["successful_patterns", "color_palette", "visual_themes", "copy_hooks"],
        additionalProperties: false,
      },
    },
  },
});

const insights = JSON.parse(response.choices[0].message.content!);
// → write to organizations.design_insights JSONB
```

### Key Differences from the Responses API Pattern

| | Responses API (`responses.create`) | Vision analysis (`chat.completions.create`) |
|---|---|---|
| Use case | Strategy/copy generation with skills | Image analysis |
| Model | `gpt-5.2` | `gpt-4o` |
| Image input | Not applicable | `image_url` content part |
| Skills/tools | `skill_reference` in shell env | Not used |
| Output | `response.output_text` | `response.choices[0].message.content` |

Ensure the image URL is publicly accessible or a valid signed URL from Supabase Storage.
The result feeds `organizations.design_insights` — see `ai-context/SKILL.md` for how it
is injected back into future creative generation.

## Best Practices Checklist

- [ ] Are you using `openai.responses.create` for skill-based generation?
- [ ] Is your `json_schema` strict (all properties required, `additionalProperties: false`)?
- [ ] Are skills passed correctly as `skill_reference` objects in a `shell` tool environment?
- [ ] Have you run `upload-skills.ts` if you modified any `.md` files in `src/lib/ai/skill-definitions/`?
- [ ] For caching, is static context placed at the beginning of the prompt/request?
- [ ] For vision analysis (Phase 3), using `chat.completions.create` + `gpt-4o` (not Responses API)?
