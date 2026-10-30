# Relight a photo with Qwen Image Edit 2509 and the Relight LoRA

Relights one photo from a direction, a softness, a color and a brightness written into one instruction, with the Relight LoRA and its trigger word. This file holds the 4-step row with the Lightning LoRA. The 40-step row leaves the Lightning LoRA out.

| | |
|---|---|
| Workflow id | `relight-qwen-image-edit-2509` |
| Run by | [`relight`](../../packages/catalog/src/relight/) |
| Core model | Qwen Image Edit 2509 with the Relight LoRA |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | The model files it loads add up to 31.2 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `image` | 1 `LoadImage` | `image` | an uploaded image |
| `direction` | 20 `StringConcatenate` | `string_b` | a value |
| `softness` | 21 `StringConcatenate` | `string_b` | a value |
| `color` | 22 `StringConcatenate` | `string_b` | a value |
| `brightness` | 23 `StringConcatenate` | `string_b` | a value |
| `detail` | 24 `StringConcatenate` | `string_b` | a value |
| `count` | 13 `RepeatLatentBatch` | `amount` | a value |
| `seed` | 14 `KSampler` | `seed` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 16 `SaveImage` | `images` | image |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `qwen_image_edit_2509_fp8_e4m3fn.safetensors` | Qwen Image Edit 2509, fp8 | [Apache-2.0](https://huggingface.co/Qwen/Qwen-Image-Edit-2509) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image-Edit_ComfyUI/resolve/main/split_files/diffusion_models/qwen_image_edit_2509_fp8_e4m3fn.safetensors) |
| `qwen_2.5_vl_7b_fp8_scaled.safetensors` | Qwen2.5-VL 7B text encoder, fp8 | [Apache-2.0](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors) |
| `qwen_image_vae.safetensors` | Qwen Image VAE | [Apache-2.0](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors) |
| `Qwen-Image-Edit-2509-Lightning-4steps-V1.0-bf16.safetensors` | Qwen Image Edit 2509 Lightning 4-step LoRA, by lightx2v | [Apache-2.0](https://huggingface.co/lightx2v/Qwen-Image-Lightning) | `models/loras` | [Hugging Face](https://huggingface.co/lightx2v/Qwen-Image-Lightning/resolve/main/Qwen-Image-Edit-2509/Qwen-Image-Edit-2509-Lightning-4steps-V1.0-bf16.safetensors) |
| `Qwen-Image-Edit-2509-Relight.safetensors` | Qwen Image Edit 2509 Relight LoRA, by dx8152 | [Apache-2.0](https://huggingface.co/dx8152/Qwen-Image-Edit-2509-Relight) | `models/loras` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image-Edit_ComfyUI/resolve/main/split_files/loras/Qwen-Image-Edit-2509-Relight.safetensors) |

## Files

- [`relight-qwen-image-edit-2509.api.json`](relight-qwen-image-edit-2509.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`relight-qwen-image-edit-2509.json`](relight-qwen-image-edit-2509.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script writes it from the API file with the node definitions of ComfyUI v0.41.0.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's published Qwen Image Edit relight templates in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17. The photo is scaled with `ImageScaleToTotalPixels` at 1 megapixel.

## Checked

Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
