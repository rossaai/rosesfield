# Layers: edit or relight one layer with Qwen Image Edit 2511

Places one transparent layer on mid grey, edits it with Qwen Image Edit 2511 and puts its alpha back. This file holds the relight form, where node 23 writes the light and tone sentences into the edit prompt, at 4 steps with the Lightning LoRA. The edit form takes your words at node 13, and the final run samples 40 steps.

| | |
|---|---|
| Workflow id | `layers-edit-qwen-image-edit-2511` |
| Run by | [`layers`](../../packages/catalog/src/layers/) |
| Core model | Qwen Image Edit 2511 |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 51.3 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `layer` | 1 `LoadImage` | `image` | an uploaded image |
| `count` | 3 `EmptyImage` | `batch_size` | a value |
| `seed` | 18 `KSampler` | `seed` | a value |
| `change` | 13 `TextEncodeQwenImageEditPlus` | `prompt` | a link the catalog picks |
| `light` | 23 `StringConcatenate` | `string_a` | a value |
| `tone` | 23 `StringConcatenate` | `string_b` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 22 `SaveImage` | `images` | image |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors` | Qwen Image Edit 2511 Lightning 4-step LoRA, by lightx2v | [Apache-2.0](https://huggingface.co/lightx2v/Qwen-Image-Edit-2511-Lightning) | `models/loras` | [Hugging Face](https://huggingface.co/lightx2v/Qwen-Image-Edit-2511-Lightning/resolve/main/Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors) |
| `qwen_image_edit_2511_bf16.safetensors` | Qwen Image Edit 2511, bf16 | [Apache-2.0](https://huggingface.co/Qwen/Qwen-Image-Edit-2511) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image-Edit_ComfyUI/resolve/main/split_files/diffusion_models/qwen_image_edit_2511_bf16.safetensors) |
| `qwen_2.5_vl_7b_fp8_scaled.safetensors` | Qwen2.5-VL 7B text encoder, fp8 | [Apache-2.0](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors) |
| `qwen_image_vae.safetensors` | Qwen Image VAE | [Apache-2.0](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors) |

## Files

- [`layers-edit-qwen-image-edit-2511.api.json`](layers-edit-qwen-image-edit-2511.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`layers-edit-qwen-image-edit-2511.json`](layers-edit-qwen-image-edit-2511.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `image_qwen_image_edit_2511` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
