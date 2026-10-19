# Image: text to image with Z-Image Turbo

Makes up to 4 images from a prompt with Z-Image Turbo in 8 steps. Built from Comfy's template image_z_image_turbo.

| | |
|---|---|
| Workflow id | `image-z-image-turbo` |
| Run by | [`image`](../../packages/catalog/src/image/) |
| Core model | Z-Image Turbo |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 20.7 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `prompt` | 27 `CLIPTextEncode` | `text` | a value |
| `seed` | 3 `KSampler` | `seed` | a value |
| `count` | 13 `EmptySD3LatentImage` | `batch_size` | a value |
| `width` | 13 `EmptySD3LatentImage` | `width` | a value |
| `height` | 13 `EmptySD3LatentImage` | `height` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 9 `SaveImage` | `images` | image |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `z_image_turbo_bf16.safetensors` | Z-Image Turbo | [Apache-2.0](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/diffusion_models/z_image_turbo_bf16.safetensors) |
| `ae.safetensors` | Z-Image VAE | [Apache-2.0](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors) |
| `qwen_3_4b.safetensors` | Qwen3 4B text encoder | [Apache-2.0](https://huggingface.co/Qwen/Qwen3-4B) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors) |

## Files

- [`image-z-image-turbo.api.json`](image-z-image-turbo.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`image-z-image-turbo.json`](image-z-image-turbo.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `image_z_image_turbo` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
