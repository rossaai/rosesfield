# Headshots: up to 4 studio portraits from one photo with Qwen Image Edit 2511

Edits your photo into up to 4 headshots in one run, from one sentence that names the framing, the background, the clothes and the glasses. Each output samples its own seed in 40 steps into an empty latent at the size of the format. Built from Comfy's template image_qwen_image_edit_2511.

| | |
|---|---|
| Workflow id | `headshots-qwen-image-edit-2511` |
| Run by | [`headshots`](../../packages/catalog/src/headshots/) |
| Core model | Qwen Image Edit 2511 |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 50.5 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `image` | 41 `LoadImage` | `image` | an uploaded image |
| `seed` | 300 `PrimitiveInt` | `value` | a value |
| `framing` | 201 `StringConcatenate` | `string_b` | a value |
| `background` | 202 `StringConcatenate` | `string_b` | a value |
| `clothes` | 203 `StringConcatenate` | `string_b` | a value |
| `glasses` | 204 `StringConcatenate` | `string_b` | a value |
| `width` | 192 `EmptySD3LatentImage` | `width` | a value |
| `height` | 192 `EmptySD3LatentImage` | `height` | a value |
| `count` | 9 `SaveImage` | `images` | a link the catalog picks |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 9 `SaveImage` | `images` | image |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `qwen_image_vae.safetensors` | Qwen Image VAE | [Apache-2.0](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors) |
| `qwen_image_edit_2511_bf16.safetensors` | Qwen Image Edit 2511, bf16 | [Apache-2.0](https://huggingface.co/Qwen/Qwen-Image-Edit-2511) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image-Edit_ComfyUI/resolve/main/split_files/diffusion_models/qwen_image_edit_2511_bf16.safetensors) |
| `qwen_2.5_vl_7b_fp8_scaled.safetensors` | Qwen2.5-VL 7B text encoder, fp8 | [Apache-2.0](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors) |

## Files

- [`headshots-qwen-image-edit-2511.api.json`](headshots-qwen-image-edit-2511.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`headshots-qwen-image-edit-2511.json`](headshots-qwen-image-edit-2511.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `image_qwen_image_edit_2511` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened. The Lightning switch is off, and each output samples into an empty latent at the size of the format.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
