### FLUX.2 \[pro\] - Text-to-Image

**Production-optimized generation** with professional quality out of the box. FLUX.2 \[pro\] delivers studio-grade images through a streamlined pipeline that prioritizes consistency and speed over parameter tuning. No inference steps to configure, no guidance scales to adjust—just pure prompt-to-image conversion optimized for production workflows where reliability matters more than experimental control.

**Built for:** Production pipelines | High-volume generation | API integrations | Consistent brand outputs | Teams prioritizing speed over parameter experimentation

#### Streamlined Professional Pipeline

FLUX.2 \[pro\] removes generation complexity to focus on what matters: translating prompts into professional-quality images with predictable results. The model's fixed optimization delivers consistent output quality without requiring expertise in inference tuning.

**What this means for you:**

- **Zero-configuration quality**: Professional-grade outputs without tuning steps or guidance parameters. The model's internal optimization handles quality decisions
- **Production consistency**: Predictable results across batch generations make pro ideal for automated workflows and API integrations
- **Fast iteration cycles**: Streamlined pipeline prioritizes generation speed for teams moving quickly through creative development
- **Flexible output formats**: Choose between JPEG (optimized file sizes) or PNG (lossless quality) based on delivery requirements
- **Reproducible generations**: Seed control maintains consistency across variations without exposing low-level inference parameters
- **Prompt enhancement**: Automatic prompt upsampling refines instructions for optimal interpretation (enabled by default)

### Advanced Prompting Techniques

#### JSON Structured Prompts

For precise control over complex generations, use structured JSON prompts instead of natural language. JSON prompting enables granular specification of scene elements, subjects, camera settings, and composition.

**Basic JSON structure:**

```
json{
  "scene": "Overall setting description",
  "subjects": [
    {
      "type": "Subject category",
      "description": "Physical attributes and details",
      "pose": "Action or stance",
      "position": "foreground/midground/background"
    }
  ],
  "style": "Artistic rendering approach",
  "color_palette": ["color1", "color2", "color3"],
  "lighting": "Lighting conditions and direction",
  "mood": "Emotional atmosphere",
  "composition": "rule of thirds/centered/dynamic diagonal",
  "camera": {
    "angle": "eye level/low angle/high angle",
    "distance": "close-up/medium shot/wide shot",
    "lens": "35mm/50mm/85mm"
  }
}
```

JSON prompts excel at controlling multiple subjects, precise positioning, and maintaining specific attributes across complex compositions.

#### HEX Color Code Control

Specify exact colors using HEX codes for precise color matching and brand consistency. Include the keyword "color" or "hex" before the code for best results.

**Examples:**

- `` `"a wall painted in color #2ECC71"` ``
- `` `"gradient from hex #FF6B6B to hex #4ECDC4"` ``
- `` `"the car in color #1A1A1A with accents in #FFD700"` ``

For enhanced accuracy, reference a color swatch image alongside the HEX code in your prompt.

#### Image Referencing with @

Reference uploaded images directly in prompts using the `` `@` `` symbol for intuitive multi-image workflows.

**Usage patterns:**

- `` `"@image1 wearing the outfit from @image2"` ``
- `` `"combine the style of @image1 with the composition of @image2"` ``
- `` `"the person from @image1 in the setting from @image3"` ``

The `` `@` `` syntax provides a natural way to reference multiple images without explicit index notation, while maintaining support for traditional "image 1", "image 2" indexing.

---

# API

---

### About

Generate images with Flux 2 Pro.

### 1\. Calling the API[#](https://fal.ai/models/fal-ai/flux-2-pro/api#api-call-install)

### Install the client[#](https://fal.ai/models/fal-ai/flux-2-pro/api#api-call-install)

The client provides a convenient way to interact with the model API.

```
npm install --save @fal-ai/client
```

### Setup your API Key[#](https://fal.ai/models/fal-ai/flux-2-pro/api#api-call-setup)

Set `FAL_KEY` as an environment variable in your runtime.

```
export FAL_KEY="YOUR_API_KEY"
```

### Submit a request[#](https://fal.ai/models/fal-ai/flux-2-pro/api#api-call-submit-request)

The client API handles the API submit protocol. It will handle the request status updates and return the result when the request is completed.

```
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/flux-2-pro", {
  input: {
    prompt: "An intense close-up of knight's visor reflecting battle, sword raised, flames in background, chiaroscuro helmet shadows, hyper-detailed armor, square medieval, cinematic lighting"
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
console.log(result.data);
console.log(result.requestId);
```

## 2\. Authentication[#](https://fal.ai/models/fal-ai/flux-2-pro/api#auth)

The API uses an API Key for authentication. It is recommended you set the `FAL_KEY` environment variable in your runtime when possible.

### API Key[#](https://fal.ai/models/fal-ai/flux-2-pro/api#auth-api-key)

In case your app is running in an environment where you cannot set environment variables, you can set the API Key manually as a client configuration.

```
import { fal } from "@fal-ai/client";

fal.config({
  credentials: "YOUR_FAL_KEY"
});
```

## 3\. Queue[#](https://fal.ai/models/fal-ai/flux-2-pro/api#queue)

### Submit a request[#](https://fal.ai/models/fal-ai/flux-2-pro/api#queue-submit)

The client API provides a convenient way to submit requests to the model.

```
import { fal } from "@fal-ai/client";

const { request_id } = await fal.queue.submit("fal-ai/flux-2-pro", {
  input: {
    prompt: "An intense close-up of knight's visor reflecting battle, sword raised, flames in background, chiaroscuro helmet shadows, hyper-detailed armor, square medieval, cinematic lighting"
  },
  webhookUrl: "https://optional.webhook.url/for/results",
});
```

### Fetch request status[#](https://fal.ai/models/fal-ai/flux-2-pro/api#queue-status)

You can fetch the status of a request to check if it is completed or still in progress.

```
import { fal } from "@fal-ai/client";

const status = await fal.queue.status("fal-ai/flux-2-pro", {
  requestId: "764cabcf-b745-4b3e-ae38-1200304cf45b",
  logs: true,
});
```

### Get the result[#](https://fal.ai/models/fal-ai/flux-2-pro/api#queue-result)

Once the request is completed, you can fetch the result. See the [Output Schema](https://fal.ai/models/fal-ai/flux-2-pro/api#schema-output) for the expected result format.

```
import { fal } from "@fal-ai/client";

const result = await fal.queue.result("fal-ai/flux-2-pro", {
  requestId: "764cabcf-b745-4b3e-ae38-1200304cf45b"
});
console.log(result.data);
console.log(result.requestId);
```

## 4\. Files[#](https://fal.ai/models/fal-ai/flux-2-pro/api#files)

Some attributes in the API accept file URLs as input. Whenever that's the case you can pass your own URL or a Base64 data URI.

### Data URI (base64)[#](https://fal.ai/models/fal-ai/flux-2-pro/api#files-data-uri)

You can pass a Base64 data URI as a file input. The API will handle the file decoding for you. Keep in mind that for large files, this alternative although convenient can impact the request performance.

### Hosted files (URL)[#](https://fal.ai/models/fal-ai/flux-2-pro/api#files-from-url)

You can also pass your own URLs as long as they are publicly accessible. Be aware that some hosts might block cross-site requests, rate-limit, or consider the request as a bot.

### Uploading files[#](https://fal.ai/models/fal-ai/flux-2-pro/api#files-upload)

We provide a convenient file storage that allows you to upload files and use them in your requests. You can upload files using the client API and use the returned URL in your requests.

```
import { fal } from "@fal-ai/client";

const file = new File(["Hello, World!"], "hello.txt", { type: "text/plain" });
const url = await fal.storage.upload(file);
```

## 5\. Schema[#](https://fal.ai/models/fal-ai/flux-2-pro/api#schema)

### Input[#](https://fal.ai/models/fal-ai/flux-2-pro/api#schema-input)

`prompt` `string`\* required

The prompt to generate an image from.

`image_size` `[ImageSize](https://fal.ai/models/fal-ai/flux-2-pro/api#type-ImageSize) | [Enum](https://fal.ai/models/fal-ai/flux-2-pro/api#type-Enum)`

The size of the generated image. Default value: `landscape_4_3`

Possible enum values: `square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9`

**Note:** For custom image sizes, you can pass the `width` and `height` as an object:

```
"image_size": {
  "width": 1280,
  "height": 720
}
```

`seed` `integer`

The seed to use for the generation.

`safety_tolerance` `SafetyToleranceEnum`

API only

The safety tolerance level for the generated image. 1 being the most strict and 5 being the most permissive. Default value: `"2"`

Possible enum values: `1, 2, 3, 4, 5`

**Note:** This property is only available through API calls.

`enable_safety_checker` `boolean`

Whether to enable the safety checker. Default value: `true`

`output_format` `OutputFormatEnum`

The format of the generated image. Default value: `"jpeg"`

Possible enum values: `jpeg, png`

`sync_mode` `boolean`

If `True`, the media will be returned as a data URI and the output data won't be available in the request history.

```
{
  "prompt": "An intense close-up of knight's visor reflecting battle, sword raised, flames in background, chiaroscuro helmet shadows, hyper-detailed armor, square medieval, cinematic lighting",
  "image_size": "landscape_4_3",
  "safety_tolerance": "2",
  "enable_safety_checker": true,
  "output_format": "jpeg"
}
```

### Output[#](https://fal.ai/models/fal-ai/flux-2-pro/api#schema-output)

`images` `list<[ImageFile](https://fal.ai/models/fal-ai/flux-2-pro/api#type-ImageFile)>`\* required

The generated images.

`seed` `integer`\* required

The seed used for the generation.

```
{
  "images": [
    {
      "url": "https://storage.googleapis.com/falserverless/example_outputs/flux2_pro_t2i_output.png"
    }
  ]
}
```

### Other types[#](https://fal.ai/models/fal-ai/flux-2-pro/api#schema-other)

#### ImageFile[#](https://fal.ai/models/fal-ai/flux-2-pro/api#type-ImageFile)

`url` `string`\* required

The URL where the file can be downloaded from.

`content_type` `string`

The mime type of the file.

`file_name` `string`

The name of the file. It will be auto-generated if not provided.

`file_size` `integer`

The size of the file in bytes.

`file_data` `string`

File data

`width` `integer`

The width of the image

`height` `integer`

The height of the image

#### ImageSize[#](https://fal.ai/models/fal-ai/flux-2-pro/api#type-ImageSize)

`width` `integer`

The width of the generated image. Default value: `512`

`height` `integer`

The height of the generated image. Default value: `512`

## Related Models

# Black-forest-lab doc:

## Prompt Structure

Use this framework for consistent results: **Subject + Action + Style + Context**

- **Subject**: The main focus (person, object, character)
- **Action**: What the subject is doing or their pose
- **Style**: Artistic approach, medium, or aesthetic
- **Context**: Setting, lighting, time, mood, or atmospheric conditions

- Example 1
- Example 2

_“Black cat hiding behind a watermelon slice, professional studio shot, bright red and turquoise background with summer mystery vibe”_

**Breakdown**:

- **Subject**: Black cat
- **Action**: hiding behind a watermelon slice
- **Style**: professional studio shot
- **Context**: bright red and turquoise background with summer mystery vibe

_“Dog wrapped in white towel after bath, photographed with direct flash and high exposure, fur wet details sharply visible, editorial raw portrait, cinematic harsh flash lighting, intimate humorous documentary style”_

**Breakdown**:

- **Subject**: Dog
- **Action**: wrapped in white towel after bath
- **Style**: editorial raw portrait, cinematic harsh flash lighting
- **Context**: direct flash and high exposure, fur wet details sharply visible, intimate humorous documentary style

Word order matters - FLUX.2 pays more attention to what comes first. Put your most important elements at the beginning: **Priority order**: Main subject → Key action → Critical style → Essential context → Secondary details **Prompt length guidance**:

- **Short (10-30 words)**: Quick concepts and style exploration
- **Medium (30-80 words)**: Usually ideal for most projects
- **Long (80+ words)**: Complex scenes requiring detailed specifications

## Photorealistic Styles

FLUX.2 generates photorealistic images from simple, natural language prompts. Reference specific eras, cameras, and techniques for distinctive looks.

### Style Reference Guide

| Style              | Key Descriptors                                                                      |
| ------------------ | ------------------------------------------------------------------------------------ |
| **Modern Digital** | ”shot on Sony A7IV, clean sharp, high dynamic range”                                 |
| **2000s Digicam**  | ”early digital camera, slight noise, flash photography, candid, 2000s digicam style” |
| **80s Vintage**    | ”film grain, warm color cast, soft focus, 80s vintage photo”                         |
| **Analog Film**    | ”shot on Kodak Portra 400, natural grain, organic colors”                            |

**Modern Photorealism:** _“Soaking wet tiger cub taking shelter under a banana leaf in the rainy jungle, close up photo”_ **2000s Digicam:** _“Sloth out drinking in Bangkok at night in a street full of party folks, 2000s digicam style, people in the background fading”_ **80s Vintage:** _“A group of baby penguins in a trampoline park, having the time of their lives, 80s vintage photo”_

### Camera and Lens Simulation

Be specific about camera settings for authentic results:

```
Shot on Hasselblad X2D, 80mm lens, f/2.8, natural lighting
```

```
Canon 5D Mark IV, 24-70mm at 35mm, golden hour, shallow depth of field
```

## Typography and Design

FLUX.2 generates clean typography, product marketing materials, and magazine layouts.

**Product Ad:** _“Samsung Galaxy S25 Ultra product advertisement, ‘Ultra-strong titanium’ headline, ‘Shielded in a strong titanium frame, your Galaxy S25 Ultra always stays protected’ subtext, close-up of phone edge showing titanium frame, dark gradient background, clean minimalist tech aesthetic, professional product photography”_ **Magazine Cover:** _“Women’s Health magazine cover, April 2025 issue, ‘Spring forward’ headline, woman in green outfit sitting on orange blocks, white sneakers, ‘Covid: five years on’ feature text, ‘15 skincare habits’ callout, professional editorial photography, magazine layout with multiple text elements”_

### Text Rendering Tips

FLUX.2 can generate readable text when you describe it clearly:

- **Use quotation marks**: _“The text ‘OPEN’ appears in red neon letters above the door”_
- **Specify placement**: Where text appears relative to other elements
- **Describe style**: “elegant serif typography”, “bold industrial lettering”, “handwritten script”
- **Font size**: “large headline text”, “small body copy”, “medium subheading”
- **Color**: Use hex codes for brand text: _“The logo text ‘ACME’ in color #FF5733”_

- Quotation marks
- Specify placement
- Describe style

Prompt: _“The text ‘OPEN’ appears in red neon letters above the door”_!['Open' neon sign](https://cdn.sanity.io/images/2gpum2i6/production/bcf4b683a76fc115ff8d6502e852e912f16d3d2e-1440x1440.jpg)

Prompt: _“Add the text “By Black Forest Labs” below the main text in the middle of the book”_

Prompt: _“Add the text “Black Forest Labs” in vibrant coral/orange, positioned center, ultra-bold decorative serif font, slight vintage poster feel.”_

## HEX Color Code Prompting

FLUX.2 supports precise color matching using hex codes. Useful for brand consistency and design work.

### Basic Syntax

Signal hex colors with keywords like “color” or “hex” followed by the code:

```
The vase has color #02eb3c
The background is hex #1a1a2e
```

### Gradient Colors

Apply gradients by specifying start and end colors: **Prompt:** _“A vase on a table in living room, the color of the vase is a gradient, starting with color #02eb3c and finishing with color #edfa3c. The flowers inside the vase have the color #ff0088”_

### Color in JSON Prompts

Combine hex colors with structured prompts for maximum control:

```
{
  "scene": "Makeup flat lay on marble surface",
  "subjects": [
    {
      "description": "eyeshadow palette",
      "colors": ["#E91E63", "#9C27B0", "#673AB7", "#3F51B5"]
    }
  ],
  "style": "beauty product photography",
  "lighting": "soft diffused overhead lighting"
}
```

## Infographics and Data Visualization

FLUX.2 can generate infographics with clean typography and structured layouts.

### Infographic Template

```
{
  "type": "infographic",
  "title": "Your Main Title",
  "subtitle": "Supporting context",
  "sections": [
    {
      "heading": "Section 1",
      "content": "Key information",
      "visual": "icon or chart type"
    }
  ],
  "color_scheme": ["#primary", "#secondary", "#accent"],
  "style": "modern, clean, corporate"
}
```

**Example Prompt:** _“Create a vertical infographic about coffee consumption worldwide. Title: ‘Global Coffee Culture’. Include 3 sections with statistics, use icons for each country, color scheme #4A2C2A (brown) and #F5E6D3 (cream). Modern minimalist style with clean typography.”_

## Multi-Language Prompting

FLUX.2 understands multiple languages. Prompt in your native language for more culturally authentic results.

**French:** _“Un marché alimentaire dans la campagne normande, des marchands vendent divers légumes, fruits. Lever de soleil, temps un peu brumeux”_ **Thai:** _“ตลาดอาหารเช้าในชนบทใกล้กรุงเทพฯ พ่อค้าแม่ค้ากำลังขายผักและผลไม้นานาชนิด บรรยากาศยามพระอาทิตย์ขึ้น มีหมอกจาง ๆ ปกคลุม สงบและอบอุ่น”_ **Korean:** _“서울 도심의 옥상 정원, 저녁 노을이 지는 하늘 아래에서 사람들이 작은 등불을 켜고 있다. 화려한 네온사인이 멀리 반짝이고, 정원에는 다양한 꽃들이 피어 있다. 분위기는 따뜻하고 낭만적이다”_

## Comic Strips and Sequential Art

Create consistent comic panels with character continuity. The key is to define your character in detail and maintain that description across panels.

### The Diffusion Man Story

Generate each panel separately while keeping character descriptions consistent:

## JSON Structured Prompting

For complex scenes and production workflows, FLUX.2 interprets structured JSON prompts, giving you precise control over every aspect of your image. **When to use JSON**:

- Production workflows requiring consistent structure
- Automation and programmatic generation
- Complex scenes with multiple subjects and relationships
- When you need to iterate on specific elements independently

**When natural language works better**:

- Quick iterations and exploration
- Simple, single-subject scenes
- When prompt length isn’t a concern
- Creative workflows where flexibility matters

FLUX.2 understands both formats equally well—choose based on your workflow needs.

### The Base Schema

```
{
  "scene": "overall scene description",
  "subjects": [
    {
      "description": "detailed subject description",
      "position": "where in frame",
      "action": "what they're doing"
    }
  ],
  "style": "artistic style",
  "color_palette": ["#hex1", "#hex2", "#hex3"],
  "lighting": "lighting description",
  "mood": "emotional tone",
  "background": "background details",
  "composition": "framing and layout",
  "camera": {
    "angle": "camera angle",
    "lens": "lens type",
    "depth_of_field": "focus behavior"
  }
}
```

### Precise Color Control Example

Break down products into components and assign exact hex colors to each part for brand consistency:

View JSON Prompt

```
{
  "scene": "A front-facing, studio product shot of an adidas sweatshirt, isolated on a clean white background",
  "subjects": [
    {
      "type": "Main Torso",
      "description": "The central chest and stomach panel of the sweatshirt, strictly in color #FFFFFF white",
      "position": "center body",
      "color_match": "exact"
    },
    {
      "type": "Shoulder Panels",
      "description": "The panels on the top of the shoulders (raglan style), strictly in color #000000 black",
      "position": "shoulders",
      "color_match": "exact"
    },
    {
      "type": "Sleeves",
      "description": "The long sleeves extending from the shoulder panels, strictly in color #86E04A lime green",
      "position": "arms",
      "color_match": "exact"
    },
    {
      "type": "Middle Sleeve Patch",
      "description": "Geometric rectangular patch on the middle sleeves, strictly in color #615E5E gray",
      "position": "middle sleeves",
      "color_match": "exact"
    },
    {
      "type": "Brand Logo",
      "description": "The Adidas Trefoil logo embroidered on the upper center chest, strictly in color #000000 black",
      "position": "upper chest center",
      "detail_preservation": "high"
    },
    {
      "type": "Trims and Stripes",
      "description": "The three-stripes on the sleeves, the ribbed neck collar, and the wrist cuffs, strictly in color #000000 black",
      "position": "trims",
      "color_match": "exact"
    },
    {
      "type": "Background",
      "description": "A flat, seamless white studio background, identical to the source",
      "position": "background",
      "color_match": "exact"
    }
  ],
  "color_palette": [
    "#FFFFFF",
    "#86E04A",
    "#615E5E",
    "#000000"
  ]
}
```

Each subject has a `type`, `description` with explicit color specification, `position`, and `color_match: "exact"` for precise control.

### Building a Prompt Step by Step

Let’s build a product shot incrementally to see how each element contributes. **Step 1: Generating a coffee mug**

```
{
  "scene": "Professional studio product photography setup with polished concrete surface",
  "subjects": [
    {
      "description": "Minimalist ceramic coffee mug with steam rising from hot coffee inside",
      "pose": "Stationary on surface",
      "position": "Center foreground on polished concrete surface",
      "color_palette": ["matte black ceramic"]
    }
  ],
  "style": "Ultra-realistic product photography with commercial quality",
  "color_palette": ["matte black", "concrete gray", "soft white highlights"],
  "lighting": "Three-point softbox setup creating soft, diffused highlights with no harsh shadows",
  "mood": "Clean, professional, minimalist",
  "background": "Polished concrete surface with studio backdrop",
  "composition": "rule of thirds",
  "camera": {
    "angle": "high angle",
    "distance": "medium shot",
    "focus": "Sharp focus on steam rising from coffee and mug details",
    "lens-mm": 85,
    "f-number": "f/5.6",
    "ISO": 200
  }
}
```

**Step 2: Adding a second mug in a different color**

```
{
  "scene": "Professional studio product photography setup with polished concrete surface",
  "subjects": [
    {
      "description": "Minimalist ceramic coffee mug with steam rising from hot coffee inside",
      "pose": "Stationary on surface",
      "position": "Center foreground on polished concrete surface",
      "color_palette": ["matte black ceramic"]
    },
    {
      "description": "Minimalist ceramic coffee mug, matching design to the black mug",
      "pose": "Stationary on surface",
      "position": "Right side of the black mug on polished concrete surface",
      "color_palette": ["matte yellow ceramic"]
    }
  ],
  "style": "Ultra-realistic product photography with commercial quality",
  "color_palette": ["matte black", "matte yellow", "concrete gray", "soft white highlights"],
  "lighting": "Three-point softbox setup creating soft, diffused highlights with no harsh shadows",
  "mood": "Clean, professional, minimalist",
  "background": "Polished concrete surface with studio backdrop",
  "composition": "rule of thirds",
  "camera": {
    "angle": "high angle",
    "distance": "medium shot",
    "focus": "Sharp focus on steam rising from coffee and both mugs in frame",
    "lens-mm": 85,
    "f-number": "f/5.6",
    "ISO": 200
  }
}
```

**Step 3: Change the color of the steam**

```
{
  "scene": "Professional studio product photography setup with polished concrete surface",
  "subjects": [
    {
      "description": "Minimalist ceramic coffee mug with bright red steam rising from hot coffee inside",
      "pose": "Stationary on surface",
      "position": "Center foreground on polished concrete surface",
      "color_palette": ["matte black ceramic", "bright red steam"]
    },
    {
      "description": "Minimalist ceramic coffee mug, matching design to the black mug",
      "pose": "Stationary on surface",
      "position": "Right side of the black mug on polished concrete surface",
      "color_palette": ["matte yellow ceramic"]
    }
  ],
  "style": "Ultra-realistic product photography with commercial quality",
  "color_palette": ["matte black", "matte yellow", "bright red", "concrete gray", "soft white highlights"],
  "lighting": "Three-point softbox setup creating soft, diffused highlights with no harsh shadows",
  "mood": "Clean, professional, minimalist",
  "background": "Polished concrete surface with studio backdrop",
  "composition": "rule of thirds",
  "camera": {
    "angle": "high angle",
    "distance": "medium shot",
    "focus": "Sharp focus on steam rising from coffee and both mugs in frame",
    "lens-mm": 85,
    "f-number": "f/5.6",
    "ISO": 200
  }
}
```

## Multi-Reference Image Editing

Multi-reference works well for:

- **Fashion shoots**: Combine clothing items into styled outfits
- **Interior design**: Place furniture and decor in rooms
- **Product composites**: Combine multiple products in scenes
- **Character consistency**: Maintain identity across variations

### Fashion Editorial Example (8 references)

**Prompt:** _“A spiritual architectural photograph captured on expired Kodak Ektachrome 64 slide film cross-processed from 1987 with a 35mm spherical lens at f/5.6, featuring model standing before small forest chapel in clearing. The model wears the outfit, positioned on stone steps leading to wooden chapel, red creating stark contrast against weathered brown timber. Background shows traditional Schwarzwald chapel - dark wood construction with small bell tower, carved wooden door, religious paintings under eaves, surrounding clearing with wild flowers, tall firs creating natural cathedral, small cemetery with wooden crosses. Dappled forest light at 1/125. Cross-processed Ektachrome showing extreme color shifts - cyan-magenta split, warm wood tones pushed to orange-brown, oversaturated red, crushed black shadows, blown highlights, heavy grain creating mysterious atmosphere. Composition emphasizes sacred spaces and pilgrimage. Thomas Struth church interiors, Candida Höfer architectural documentation, religious tourism meets fashion editorial, spiritual Schwarzwald mysticism.”_

## Prompt Upsampling

FLUX.2 includes a `prompt_upsampling` parameter that automatically enhances your prompt. Use it for:

- Quick iterations without crafting detailed prompts
- Exploring creative variations
- When you have a basic concept but want richer output

## Aspect Ratios and Resolution

Choose aspect ratios based on your use case:

| Aspect Ratio          | Use Case                        | Example Dimensions   |
| --------------------- | ------------------------------- | -------------------- |
| **1:1** (Square)      | Social media, product shots     | 1024×1024, 1536×1536 |
| **16:9** (Widescreen) | Landscapes, cinematic shots     | 1920×1080, 1536×864  |
| **9:16** (Portrait)   | Mobile content, portraits       | 1080×1920, 864×1536  |
| **4:3** (Classic)     | Magazine layouts, presentations | 1536×1152, 1024×768  |
| **21:9** (Ultrawide)  | Panoramas, wide scenes          | 2048×864             |

**Resolution limits**: Minimum 64×64, maximum 4MP (e.g., 2048×2048). Output dimensions must be multiples of 16. Recommended up to 2MP for most use cases.

## Best Practices Summary

## Quick Reference

| Technique         | When to Use                  | Key Syntax                             |
| ----------------- | ---------------------------- | -------------------------------------- |
| JSON Prompts      | Complex scenes, automation   | `{"scene": "...", "style": "..."}`     |
| Hex Colors        | Brand work, precise matching | `color #FF5733` or `hex #FF5733`       |
| Camera References | Photorealism                 | `shot on [camera], [lens], [settings]` |
| Style Eras        | Period-specific looks        | `80s vintage`, `2000s digicam`         |
| Multi-Reference   | Composite images             | \[pro\]: 8, \[flex\]: 10, \[dev\]: ~6  |
| Seed              | Reproducible results         | `seed: 42`                             |
| Guidance \[flex\] | Prompt adherence             | `guidance: 4.5` (1.5-10)               |
| Steps \[flex\]    | Quality vs speed             | `steps: 50` (max 50)                   |
| Aspect Ratios     | Use case optimization        | 1:1, 16:9, 9:16, 4:3, 21:9             |

[

## Try FLUX.2

Test these prompting techniques in the playground.

](https://playground.bfl.ai/)
