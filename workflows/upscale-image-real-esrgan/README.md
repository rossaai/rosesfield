# Upscale an image 2 or 4 times with Real-ESRGAN

Raises the resolution of one image with Real-ESRGAN x4plus, a model with no random step. A 2 times run makes the 4 times image and scales it down by half.

| | |
|---|---|
| Workflow id | `upscale-image-real-esrgan` |
| Run by | [`upscale`](../../packages/catalog/src/upscale/) |
| Core model | Real-ESRGAN x4plus |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 0.1 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `image` | 1 `LoadImage` | `image` | an uploaded image |
| `scale` | 4 `ImageScaleBy` | `scale_by` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 9 `SaveImage` | `images` | image |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `RealESRGAN_x4plus.safetensors` | Real-ESRGAN x4plus | [BSD-3-Clause](https://github.com/xinntao/Real-ESRGAN) | `models/upscale_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Real-ESRGAN_repackaged/resolve/main/RealESRGAN_x4plus.safetensors) |

## Files

- [`upscale-image-real-esrgan.api.json`](upscale-image-real-esrgan.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`upscale-image-real-esrgan.json`](upscale-image-real-esrgan.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's blueprint `video_upscale_gan_x4` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the alpha channel joined back.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
