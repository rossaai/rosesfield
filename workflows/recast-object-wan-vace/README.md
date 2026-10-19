# Recast: swap one object in a clip with Wan VACE

Finds the object you name in your clip with SAM 3.1 and renders the object you describe in its place with Wan 2.1 VACE 14B, keeping the rest of the clip. Built from Comfy's template video_wan_vace_inpainting.

| | |
|---|---|
| Workflow id | `recast-object-wan-vace` |
| Run by | [`recast`](../../packages/catalog/src/recast/), [`remake`](../../packages/catalog/src/remake/) |
| Core model | Wan 2.1 VACE 14B |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 43.4 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `source` | 1 `LoadVideo` | `file` | an uploaded video |
| `target` | 13 `CLIPTextEncode` | `text` | a value |
| `prompt` | 25 `CLIPTextEncode` | `text` | a value |
| `seed` | 35 `KSampler` | `seed` | a value |
| `secondSeed` | 65 `KSampler` | `seed` | a value |
| `keepSound` | 82 `PrimitiveBoolean` | `value` | a value |
| `width` | 3 `ResizeImageMaskNode` | `resize_type.width` | a value |
| `height` | 3 `ResizeImageMaskNode` | `resize_type.height` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 85 `SaveVideo` | `images` | video |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `sam3.1_multiplex_fp16.safetensors` | SAM 3.1, by Meta | [SAM License](https://github.com/facebookresearch/sam3/blob/main/LICENSE) | `models/checkpoints` | [Hugging Face](https://huggingface.co/Comfy-Org/sam3.1/resolve/main/checkpoints/sam3.1_multiplex_fp16.safetensors) |
| `wan2.1_vace_14B_fp16.safetensors` | Wan 2.1 VACE 14B | [Apache-2.0](https://huggingface.co/Wan-AI/Wan2.1-VACE-14B) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/diffusion_models/wan2.1_vace_14B_fp16.safetensors) |
| `umt5_xxl_fp8_e4m3fn_scaled.safetensors` | umt5-xxl text encoder, fp8 | [Apache-2.0](https://huggingface.co/google/umt5-xxl) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors) |
| `wan_2.1_vae.safetensors` | Wan 2.1 VAE | [Apache-2.0](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors) |

## Files

- [`recast-object-wan-vace.api.json`](recast-object-wan-vace.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`recast-object-wan-vace.json`](recast-object-wan-vace.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `video_wan_vace_inpainting` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened.

SAM 3.1 runs under the SAM License, and its text travels beside these workflows as [`../sam-license.txt`](../sam-license.txt).

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
