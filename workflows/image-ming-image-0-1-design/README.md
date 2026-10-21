# Image: text to image with Ming Image 0.1 Design

Makes up to 4 images from a prompt with Ming Image 0.1 Design in 12 steps. Built from Comfy's template image_ming_image_01_design_t2i.

| | |
|---|---|
| Workflow id | `image-ming-image-0-1-design` |
| Run by | [`image`](../../packages/catalog/src/image/) |
| Core model | Ming Image 0.1 Design, by inclusionAI |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 25.9 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `prompt` | 40 `CLIPTextEncode` | `text` | a value |
| `seed` | 26 `RandomNoise` | `noise_seed` | a value |
| `count` | 41 `EmptyLatentImage` | `batch_size` | a value |
| `width` | 41 `EmptyLatentImage` | `width` | a value |
| `height` | 41 `EmptyLatentImage` | `height` | a value |
| `samplingWidth` | 42 `ModelSamplingFlux` | `width` | a value, the same as `width` |
| `samplingHeight` | 42 `ModelSamplingFlux` | `height` | a value, the same as `height` |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 84 `SaveImage` | `images` | image |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `ming_image_0.1_design_int8_convrot.safetensors` | Ming Image 0.1 Design | [MIT](https://huggingface.co/inclusionAI/Ming-Image-0.1-Design) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Ming-Image/resolve/main/diffusion_models/ming_image_0.1_design_int8_convrot.safetensors) |
| `ming_image_0.1_ling_mini_2.0_int8_convrot.safetensors` | Ling mini 2.0 text encoder | [MIT](https://huggingface.co/inclusionAI/Ming-Image-0.1-Design) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/Ming-Image/resolve/main/text_encoders/ming_image_0.1_ling_mini_2.0_int8_convrot.safetensors) |
| `ming_image_vae_bf16.safetensors` | Ming Image VAE | [MIT](https://huggingface.co/inclusionAI/Ming-Image-0.1-Design) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/Ming-Image/resolve/main/vae/ming_image_vae_bf16.safetensors) |

The model's `LICENSE` at inclusionAI/Ming-Image-0.1-Design revision `c57c49689d12ef7d4e24a170014f1dc43d3ce258` is MIT. Comfy-Org/Ming-Image, which holds the files, carries `license: mit` on its card at revision `93804ff3747517a318969c5f61b25a57daefe09f`.

## Files

- [`image-ming-image-0-1-design.api.json`](image-ming-image-0-1-design.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`image-ming-image-0-1-design.json`](image-ming-image-0-1-design.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with its download link and its SHA256. A script wrote it from the API file. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `image_ming_image_01_design_t2i` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates) at revision `46e060ea88eb07adecf07197ec384c54a70e030c`, MIT, read on 2026-10-20, with its subgraph opened. Three changes from the template:

- The prompt enhancer is left out: the `TextGenerate` node, its Qwen3.8-27B text encoder, its system prompt and its switch. Your prompt reaches `CLIPTextEncode` as you wrote it, the way the template runs with `enable_PE` off.
- The `ResolutionSelector` and the two `PrimitiveInt` nodes are left out. The catalog sets the size on `EmptyLatentImage` and on `ModelSamplingFlux` from the format and the resolution you pick.
- `SaveImage` saves the result in place of `SaveImageAdvanced`, with Rosesfield's file prefix.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, links and fixed values were read from the template, which Comfy Cloud runs with no custom nodes.
