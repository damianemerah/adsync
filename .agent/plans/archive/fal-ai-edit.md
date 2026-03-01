# Flux 2 Pro Edit (fal-ai/flux-2-pro/edit)

**Endpoint:** `fal-ai/flux-2-pro/edit`

Flux 2 Pro Edit is a state-of-the-art model for image editing and refinement. It accepts a text prompt and one or more input images to generate high-fidelity variations or edits.

## Key Features

- **Multi-Reference Support:** Can take multiple input images (though typically 1 is used for standard refinement).
- **Natural Language Instructions:** Works best with descriptive prompts like "Make it look like a painting" or "Add a pair of glasses".
- **High Resolution:** Output defaults to square_hd or can auto-match input.

## API Parameters

| Parameter          | Type     | Required | Description                                                  |
| :----------------- | :------- | :------- | :----------------------------------------------------------- |
| `prompt`           | string   | Yes      | The prompt to generate the image request.                    |
| `image_urls`       | string[] | Yes      | List of URLs to input images.                                |
| `image_size`       | string   | No       | Size of output (e.g., `square_hd`, `landscape_4_3`, `auto`). |
| `safety_tolerance` | string   | No       | Content moderation level (1-6). Default: 2.                  |
| `output_format`    | string   | No       | `jpeg` or `png`.                                             |
| `sync_mode`        | boolean  | No       | If true, wait for result.                                    |
| `seed`             | integer  | No       | Random seed for reproducibility.                             |

## Example Usage (AdSync Implementation)

```typescript
// src/actions/ai-images.ts

const result = await fal.subscribe("fal-ai/flux-2-pro/edit", {
  input: {
    prompt: "A cyberpunk city street at night, neon lights",
    image_urls: ["https://example.com/original-image.jpg"],
    image_size: "auto",
    safety_tolerance: "2",
    output_format: "jpeg",
    sync_mode: true,
  },
  logs: true,
});
```

## Tips for Best Results

1.  **Refinement:** Use this endpoint when you want to keep the composition of the original image but change the style or specific details.
2.  **Prompting:** Be specific about what should change. If you want to keep potential details, mention them.
3.  **Chat History:** AdSync logs these edit requests with `request_type: 'image_edit'` in the `ai_requests` table.

---

# RAW API

---

### About

Edit images with Flux 2 Pro.

### 1\. Calling the API[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#api-call-install)

### Install the client[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#api-call-install)

The client provides a convenient way to interact with the model API.

```
npm install --save @fal-ai/client
```

### Setup your API Key[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#api-call-setup)

Set `FAL_KEY` as an environment variable in your runtime.

```
export FAL_KEY="YOUR_API_KEY"
```

### Submit a request[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#api-call-submit-request)

The client API handles the API submit protocol. It will handle the request status updates and return the result when the request is completed.

```
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/flux-2-pro/edit", {
  input: {
    prompt: "Place realistic flames emerging from the top of the coffee cup, dancing above the rim",
    image_urls: ["https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png"]
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

## 2\. Authentication[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#auth)

The API uses an API Key for authentication. It is recommended you set the `FAL_KEY` environment variable in your runtime when possible.

### API Key[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#auth-api-key)

In case your app is running in an environment where you cannot set environment variables, you can set the API Key manually as a client configuration.

```
import { fal } from "@fal-ai/client";

fal.config({
  credentials: "YOUR_FAL_KEY"
});
```

## 3\. Queue[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#queue)

### Submit a request[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#queue-submit)

The client API provides a convenient way to submit requests to the model.

```
import { fal } from "@fal-ai/client";

const { request_id } = await fal.queue.submit("fal-ai/flux-2-pro/edit", {
  input: {
    prompt: "Place realistic flames emerging from the top of the coffee cup, dancing above the rim",
    image_urls: ["https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png"]
  },
  webhookUrl: "https://optional.webhook.url/for/results",
});
```

### Fetch request status[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#queue-status)

You can fetch the status of a request to check if it is completed or still in progress.

```
import { fal } from "@fal-ai/client";

const status = await fal.queue.status("fal-ai/flux-2-pro/edit", {
  requestId: "764cabcf-b745-4b3e-ae38-1200304cf45b",
  logs: true,
});
```

### Get the result[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#queue-result)

Once the request is completed, you can fetch the result. See the [Output Schema](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#schema-output) for the expected result format.

```
import { fal } from "@fal-ai/client";

const result = await fal.queue.result("fal-ai/flux-2-pro/edit", {
  requestId: "764cabcf-b745-4b3e-ae38-1200304cf45b"
});
console.log(result.data);
console.log(result.requestId);
```

## 4\. Files[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#files)

Some attributes in the API accept file URLs as input. Whenever that's the case you can pass your own URL or a Base64 data URI.

### Data URI (base64)[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#files-data-uri)

You can pass a Base64 data URI as a file input. The API will handle the file decoding for you. Keep in mind that for large files, this alternative although convenient can impact the request performance.

### Hosted files (URL)[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#files-from-url)

You can also pass your own URLs as long as they are publicly accessible. Be aware that some hosts might block cross-site requests, rate-limit, or consider the request as a bot.

### Uploading files[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#files-upload)

We provide a convenient file storage that allows you to upload files and use them in your requests. You can upload files using the client API and use the returned URL in your requests.

```
import { fal } from "@fal-ai/client";

const file = new File(["Hello, World!"], "hello.txt", { type: "text/plain" });
const url = await fal.storage.upload(file);
```

## 5\. Schema[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#schema)

### Input[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#schema-input)

`prompt` `string`\* required

The prompt to generate an image from.

`image_size` `[ImageSize](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#type-ImageSize) | [Enum](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#type-Enum)`

The size of the generated image. If `auto`, the size will be determined by the model. Default value: `auto`

Possible enum values: `auto, square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9`

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

`image_urls` `list<[string](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#type-string)>`\* required

List of URLs of input images for editing

```
{
  "prompt": "Place realistic flames emerging from the top of the coffee cup, dancing above the rim",
  "image_size": "auto",
  "safety_tolerance": "2",
  "enable_safety_checker": true,
  "output_format": "jpeg",
  "image_urls": [
    "https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png"
  ]
}
```

### Output[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#schema-output)

`images` `list<[ImageFile](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#type-ImageFile)>`\* required

The generated images.

`seed` `integer`\* required

The seed used for the generation.

```
{
  "images": [
    {
      "url": "https://storage.googleapis.com/falserverless/example_outputs/flux2_pro_edit_output.png"
    }
  ]
}
```

### Other types[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#schema-other)

#### ImageFile[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#type-ImageFile)

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

#### ImageSize[#](https://fal.ai/models/fal-ai/flux-2-pro/edit/api#type-ImageSize)

`width` `integer`

The width of the generated image. Default value: `512`

`height` `integer`

The height of the generated image. Default value: `512`

## Related Models

---

# Troubleshooting & Best Practices

## Achieving Background Consistency (The "Seed" Trick)

When using `flux-2-pro/edit`, the model defaults to a random seed for every request, which changes the noise pattern and thus the background details—even if your prompt asks to "keep the background".

**Solution:**
Pass the `seed` from the _original_ generation into the _refinement_ request.

- **Original Generation:** Returns a `seed` (e.g., 123456).
- **Refinement:** Send `seed: 123456` along with your edit prompt.

AdSync deals with this automatically in the Studio, but if using the API manually, ensure you pass the seed.

## Text Rendering Limitations

Flux 2 Pro is an image generator, not a text layout engine.

- **Issue:** Prompting for "Three boxes with +37% ROI, +32% CR" often results in gibberish or "alien text".
- **Workaround:**
  1.  **Keep it Simple:** Ask for "Three empty boxes" or "Three boxes with text placeholders".
  2.  **Use Canvas:** Generate the visual assets with AI, then use the Canvas Editor to overlay crisp, readable text.
  3.  **Relax Constraints:** Don't expect pixel-perfect typography from the model.
