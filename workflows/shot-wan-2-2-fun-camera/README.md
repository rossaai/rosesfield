# Shot: a directed shot from a start frame on Wan 2.2 Fun Camera

Renders one shot at 480p from your start frame, your prompt and six choices written as sentences, and moves the camera along one pose with Wan 2.2 Fun Control Camera A14B. With no movement chosen, the graph runs with no camera pose. Built from Comfy's template video_wan2_2_14B_fun_camera.

| | |
|---|---|
| Workflow id | `shot-wan-2-2-fun-camera` |
| Run by | [`shot`](../../packages/catalog/src/shot/) |
| Core model | Wan 2.2 Fun Control Camera A14B |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 37.6 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `prompt` | 900 `StringTrim` | `string` | a value |
| `camera` | 902 `StringConcatenate` | `string_b` | a value |
| `lens` | 903 `StringConcatenate` | `string_b` | a value |
| `focus` | 904 `StringConcatenate` | `string_b` | a value |
| `light` | 905 `StringConcatenate` | `string_b` | a value |
| `color` | 906 `StringConcatenate` | `string_b` | a value |
| `mood` | 907 `StringConcatenate` | `string_b` | a value |
| `cameraPose` | 108 `WanCameraEmbedding` | `camera_pose` | a value |
| `startFrame` | 97 `LoadImage` | `image` | an uploaded image |
| `width` | 108 `WanCameraEmbedding` | `width` | a value |
| `height` | 108 `WanCameraEmbedding` | `height` | a value |
| `seed` | 102 `KSamplerAdvanced` | `noise_seed` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 106 `SaveVideo` | `images` | video |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `wan_2.1_vae.safetensors` | Wan 2.1 VAE | [Apache-2.0](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors) |
| `wan2.2_fun_camera_high_noise_14B_fp8_scaled.safetensors` | Wan 2.2 Fun Control Camera A14B, high noise, fp8 | [Apache-2.0](https://huggingface.co/alibaba-pai/Wan2.2-Fun-A14B-Control-Camera) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/diffusion_models/wan2.2_fun_camera_high_noise_14B_fp8_scaled.safetensors) |
| `wan2.2_fun_camera_low_noise_14B_fp8_scaled.safetensors` | Wan 2.2 Fun Control Camera A14B, low noise, fp8 | [Apache-2.0](https://huggingface.co/alibaba-pai/Wan2.2-Fun-A14B-Control-Camera) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/diffusion_models/wan2.2_fun_camera_low_noise_14B_fp8_scaled.safetensors) |
| `umt5_xxl_fp8_e4m3fn_scaled.safetensors` | umt5-xxl text encoder, fp8 | [Apache-2.0](https://huggingface.co/google/umt5-xxl) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors) |

## Files

- [`shot-wan-2-2-fun-camera.api.json`](shot-wan-2-2-fun-camera.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`shot-wan-2-2-fun-camera.json`](shot-wan-2-2-fun-camera.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `video_wan2_2_14B_fun_camera` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
