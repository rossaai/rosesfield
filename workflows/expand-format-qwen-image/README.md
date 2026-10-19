# Expand: a photo to a new format with Qwen Image and the InstantX inpainting ControlNet

Computes the canvas of the new format around your photo with math nodes, pads the photo, and fills the new area with Qwen Image, the InstantX inpainting ControlNet and the Lightning LoRA in 4 steps. The photo keeps its pixels.

| | |
|---|---|
| Workflow id | `expand-format-qwen-image` |
| Run by | [`expand`](../../packages/catalog/src/expand/) |
| Core model | Qwen Image with the InstantX inpainting ControlNet |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 36.0 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `photo` | 1 `LoadImage` | `image` | an uploaded image |
| `scene` | 37 `CLIPTextEncode` | `text` | a value |
| `seed` | 41 `KSampler` | `seed` | a value |
| `count` | 30 `RepeatImageBatch` | `amount` | a value |
| `outputCount` | 47 `RepeatImageBatch` | `amount` | a value |
| `ratioWidth` | 7 `PrimitiveInt` | `value` | a value |
| `ratioHeight` | 8 `PrimitiveInt` | `value` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 49 `SaveImage` | `images` | image |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `qwen_image_fp8_e4m3fn.safetensors` | Qwen Image, fp8 | [Apache-2.0](https://huggingface.co/Qwen/Qwen-Image) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/diffusion_models/qwen_image_fp8_e4m3fn.safetensors) |
| `Qwen-Image-Lightning-4steps-V1.0.safetensors` | Qwen Image Lightning 4-step LoRA, by lightx2v | [Apache-2.0](https://huggingface.co/lightx2v/Qwen-Image-Lightning) | `models/loras` | [Hugging Face](https://huggingface.co/lightx2v/Qwen-Image-Lightning/resolve/main/Qwen-Image-Lightning-4steps-V1.0.safetensors) |
| `qwen_2.5_vl_7b_fp8_scaled.safetensors` | Qwen2.5-VL 7B text encoder, fp8 | [Apache-2.0](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors) |
| `qwen_image_vae.safetensors` | Qwen Image VAE | [Apache-2.0](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors) |
| `Qwen-Image-InstantX-ControlNet-Inpainting.safetensors` | Qwen Image InstantX inpainting ControlNet | [Apache-2.0](https://huggingface.co/InstantX/Qwen-Image-ControlNet-Inpainting) | `models/controlnet` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image-InstantX-ControlNets/resolve/main/split_files/controlnet/Qwen-Image-InstantX-ControlNet-Inpainting.safetensors) |

## Files

- [`expand-format-qwen-image.api.json`](expand-format-qwen-image.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`expand-format-qwen-image.json`](expand-format-qwen-image.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's blueprint `image_outpainting_qwen_image` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with its three subgraphs opened.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
