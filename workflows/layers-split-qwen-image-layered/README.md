# Layers: split an image into 2 to 8 layers with Qwen Image Layered

Splits your image into 2 to 8 transparent layers with Qwen Image Layered. This file holds the draft bucket of 640 pixels on the longer side. The final run sets the bucket to 1024. Built from Comfy's template image_qwen_image_layered.

| | |
|---|---|
| Workflow id | `layers-split-qwen-image-layered` |
| Run by | [`layers`](../../packages/catalog/src/layers/) |
| Core model | Qwen Image Layered |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 50.5 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `source` | 1 `LoadImage` | `image` | an uploaded image |
| `seed` | 14 `KSampler` | `seed` | a value |
| `count` | 13 `EmptyQwenImageLayeredLatentImage` | `layers` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 18 `SaveImage` | `images` | image |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `qwen_image_layered_bf16.safetensors` | Qwen Image Layered, bf16 | [Apache-2.0](https://huggingface.co/Qwen/Qwen-Image-Layered) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image-Layered_ComfyUI/resolve/main/split_files/diffusion_models/qwen_image_layered_bf16.safetensors) |
| `qwen_2.5_vl_7b_fp8_scaled.safetensors` | Qwen2.5-VL 7B text encoder, fp8 | [Apache-2.0](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors) |
| `qwen_image_layered_vae.safetensors` | Qwen Image Layered VAE | [Apache-2.0](https://huggingface.co/Qwen/Qwen-Image-Layered) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image-Layered_ComfyUI/resolve/main/split_files/vae/qwen_image_layered_vae.safetensors) |

## Files

- [`layers-split-qwen-image-layered.api.json`](layers-split-qwen-image-layered.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`layers-split-qwen-image-layered.json`](layers-split-qwen-image-layered.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `image_qwen_image_layered` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
