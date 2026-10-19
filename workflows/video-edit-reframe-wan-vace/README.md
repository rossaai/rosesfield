# Video edit: reframe a clip to another format with Wan VACE

Places your clip, resampled to 16 frames per second, in the middle of a frame of another format and fills the new area with Wan 2.1 VACE 14B, with its sound kept or left out. Built from Comfy's template video_wan_vace_outpainting.

| | |
|---|---|
| Workflow id | `video-edit-reframe-wan-vace` |
| Run by | [`video-edit`](../../packages/catalog/src/video-edit/) |
| Core model | Wan 2.1 VACE 14B |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 46.3 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `source` | 1 `LoadVideo` | `file` | an uploaded video |
| `keepSound` | 41 `PrimitiveBoolean` | `value` | a value |
| `width` | 12 `PrimitiveInt` | `value` | a value |
| `height` | 13 `PrimitiveInt` | `value` | a value |
| `prompt` | 34 `CLIPTextEncode` | `text` | a value |
| `seed` | 37 `KSampler` | `seed` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 44 `SaveVideo` | `images` | video |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `wan2.1_vace_14B_fp16.safetensors` | Wan 2.1 VACE 14B | [Apache-2.0](https://huggingface.co/Wan-AI/Wan2.1-VACE-14B) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/diffusion_models/wan2.1_vace_14B_fp16.safetensors) |
| `umt5_xxl_fp16.safetensors` | umt5-xxl text encoder, fp16 | [Apache-2.0](https://huggingface.co/google/umt5-xxl) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp16.safetensors) |
| `wan_2.1_vae.safetensors` | Wan 2.1 VAE | [Apache-2.0](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors) |

## Files

- [`video-edit-reframe-wan-vace.api.json`](video-edit-reframe-wan-vace.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`video-edit-reframe-wan-vace.json`](video-edit-reframe-wan-vace.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `video_wan_vace_outpainting` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened.

Nodes 300 to 504 resample your clip to 16 frames per second: 81 math nodes pick a source frame each, 81 `ImageFromBatch` nodes take them, and `BatchImagesNode` joins them.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
