# Layers: fill a masked area of one layer with Qwen Image and the DiffSynth inpaint patch

Fills the area your mask marks on one layer with Qwen Image and the DiffSynth inpaint model patch, then pastes the result back into the layer with its alpha. This file holds the draft run at 20 steps. The final run samples 50. Before each run the catalog adds a `SolidMask` and a `MaskComposite` that lower the mask that node 51 `JoinImageWithAlpha` reads by half of one 8-bit step, because the mask turns into alpha as 1 minus a float32 value and `SaveImage` truncates, which loses one level on 95 of the 256 alpha values.

| | |
|---|---|
| Workflow id | `layers-fill-qwen-image` |
| Run by | [`layers`](../../packages/catalog/src/layers/) |
| Core model | Qwen Image with the DiffSynth inpaint patch |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | The model files it loads add up to 32.3 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `layer` | 1 `LoadImage` | `image` | an uploaded image |
| `count` | 3 `EmptyImage` | `batch_size` | a value |
| `mask` | 30 `LoadImageMask` | `image` | an uploaded image |
| `content` | 40 `CLIPTextEncode` | `text` | a value |
| `seed` | 45 `KSampler` | `seed` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 52 `SaveImage` | `images` | image |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `qwen_image_fp8_e4m3fn.safetensors` | Qwen Image, fp8 | [Apache-2.0](https://huggingface.co/Qwen/Qwen-Image) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/diffusion_models/qwen_image_fp8_e4m3fn.safetensors) |
| `qwen_2.5_vl_7b_fp8_scaled.safetensors` | Qwen2.5-VL 7B text encoder, fp8 | [Apache-2.0](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors) |
| `qwen_image_vae.safetensors` | Qwen Image VAE | [Apache-2.0](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors) |
| `qwen_image_inpaint_diffsynth_controlnet.safetensors` | Qwen Image DiffSynth inpaint model patch | [Apache-2.0](https://huggingface.co/Comfy-Org/Qwen-Image-DiffSynth-ControlNets) | `models/model_patches` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image-DiffSynth-ControlNets/resolve/main/split_files/model_patches/qwen_image_inpaint_diffsynth_controlnet.safetensors) |

## Files

- [`layers-fill-qwen-image.api.json`](layers-fill-qwen-image.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`layers-fill-qwen-image.json`](layers-fill-qwen-image.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script writes it from the API file with the node definitions of ComfyUI v0.41.0.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `image_qwen_image_controlnet_patch` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened.

## Checked

Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
