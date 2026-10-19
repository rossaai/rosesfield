# Characters: a new person from chosen traits with Qwen Image 2512

Writes one prompt from the traits you choose and makes up to 4 images of one new person with Qwen Image 2512 in 50 steps. Built from Comfy's template image_qwen_Image_2512.

| | |
|---|---|
| Workflow id | `characters-traits-qwen-image-2512` |
| Run by | [`characters`](../../packages/catalog/src/characters/) |
| Core model | Qwen Image 2512 |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 30.1 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `framing` | 101 `StringConcatenate` | `string_a` | a value |
| `gender` | 101 `StringConcatenate` | `string_b` | a value |
| `age` | 102 `StringConcatenate` | `string_b` | a value |
| `skinTone` | 103 `StringConcatenate` | `string_b` | a value |
| `bodyType` | 104 `StringConcatenate` | `string_b` | a value |
| `hairLength` | 105 `StringConcatenate` | `string_b` | a value |
| `hairStyle` | 106 `StringConcatenate` | `string_b` | a value |
| `hairColor` | 107 `StringConcatenate` | `string_b` | a value |
| `eyeColor` | 108 `StringConcatenate` | `string_b` | a value |
| `outfit` | 109 `StringConcatenate` | `string_b` | a value |
| `plainBackground` | 110 `StringConcatenate` | `string_b` | a value |
| `hairWiring` | 108 `StringConcatenate` | `string_a` | a link the catalog picks |
| `details` | 112 `StringConcatenate` | `string_b` | a value |
| `width` | 6 `EmptySD3LatentImage` | `width` | a value |
| `height` | 6 `EmptySD3LatentImage` | `height` | a value |
| `count` | 6 `EmptySD3LatentImage` | `batch_size` | a value |
| `seed` | 7 `KSampler` | `seed` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 13 `SaveImage` | `images` | image |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `qwen_image_2512_fp8_e4m3fn.safetensors` | Qwen Image 2512, fp8 | [Apache-2.0](https://huggingface.co/Qwen/Qwen-Image-2512) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/diffusion_models/qwen_image_2512_fp8_e4m3fn.safetensors) |
| `qwen_2.5_vl_7b_fp8_scaled.safetensors` | Qwen2.5-VL 7B text encoder, fp8 | [Apache-2.0](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors) |
| `qwen_image_vae.safetensors` | Qwen Image VAE | [Apache-2.0](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors) |

## Files

- [`characters-traits-qwen-image-2512.api.json`](characters-traits-qwen-image-2512.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`characters-traits-qwen-image-2512.json`](characters-traits-qwen-image-2512.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `image_qwen_Image_2512` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened. Nodes 101 to 112 write the prompt from the traits.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
