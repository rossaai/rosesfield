# Video: image to video on Wan 2.2 14B

Makes a clip of 2 to 5 seconds at 480p that starts from your image with Wan 2.2 I2V A14B. It makes no sound. Built from Comfy's template video_wan2_2_14B_i2v.

| | |
|---|---|
| Workflow id | `video-wan-2-2-start-frame` |
| Run by | [`video`](../../packages/catalog/src/video/) |
| Core model | Wan 2.2 I2V A14B |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 35.6 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `prompt` | 93 `CLIPTextEncode` | `text` | a value |
| `startFrame` | 97 `LoadImage`, Start frame | `image` | an uploaded image |
| `width` | 98 `WanImageToVideo` | `width` | a value |
| `height` | 98 `WanImageToVideo` | `height` | a value |
| `frames` | 98 `WanImageToVideo` | `length` | a value |
| `seed` | 86 `KSamplerAdvanced` | `noise_seed` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 108 `SaveVideo` | `images` | video |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `umt5_xxl_fp8_e4m3fn_scaled.safetensors` | umt5-xxl text encoder, fp8 | [Apache-2.0](https://huggingface.co/google/umt5-xxl) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors) |
| `wan_2.1_vae.safetensors` | Wan 2.1 VAE | [Apache-2.0](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors) |
| `wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors` | Wan 2.2 I2V A14B, high noise, fp8 | [Apache-2.0](https://huggingface.co/Wan-AI/Wan2.2-I2V-A14B) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/diffusion_models/wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors) |
| `wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors` | Wan 2.2 I2V A14B, low noise, fp8 | [Apache-2.0](https://huggingface.co/Wan-AI/Wan2.2-I2V-A14B) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/diffusion_models/wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors) |

## Files

- [`video-wan-2-2-start-frame.api.json`](video-wan-2-2-start-frame.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`video-wan-2-2-start-frame.json`](video-wan-2-2-start-frame.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `video_wan2_2_14B_i2v` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
