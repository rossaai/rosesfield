# Motion: move a photo with the motion of a clip on Wan Animate 2

Renders the person in your photo with the motion of your clip on Wan Animate 2 Distill in 10 steps. A loop makes chunks of 81 frames and cuts the result to the clip's frame count, at the clip's frame rate, with the clip's sound kept or left out. The node ids are the inner ids of Comfy's template, with its subgraph opened.

| | |
|---|---|
| Workflow id | `motion-wan-animate-2` |
| Run by | [`motion`](../../packages/catalog/src/motion/) |
| Core model | Wan Animate 2 Distill |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 24.9 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `photo` | 189 `LoadImage` | `image` | an uploaded image |
| `clip` | 240 `LoadVideo` | `file` | an uploaded video |
| `scene` | 582 `CLIPTextEncode` | `text` | a value |
| `shortSide` | 702 `PrimitiveInt` | `value` | a value |
| `seed` | 597 `SamplerCustom` | `noise_seed` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 246 `SaveVideo` | `images` | video |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `wan_animate_2_distill_int8_convrot.safetensors` | Wan Animate 2 Distill, int8 | [Apache-2.0](https://huggingface.co/Wan-AI/Wan-Animate-2-14B) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan-Animate-2/resolve/main/diffusion_models/wan_animate_2_distill_int8_convrot.safetensors) |
| `umt5_xxl_fp8_e4m3fn_scaled.safetensors` | umt5-xxl text encoder, fp8 | [Apache-2.0](https://huggingface.co/google/umt5-xxl) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors) |
| `clip_vision_h.safetensors` | CLIP ViT-H vision encoder | [MIT](https://huggingface.co/laion/CLIP-ViT-H-14-laion2B-s32B-b79K) | `models/clip_vision` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan-Animate-2/resolve/main/clip_vision/clip_vision_h.safetensors) |
| `Wan2_1_VAE_bf16.safetensors` | Wan 2.1 VAE, Kijai's build | [Apache-2.0](https://huggingface.co/Wan-AI/Wan2.1-I2V-14B-480P) | `models/vae` | [Hugging Face](https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Wan2_1_VAE_bf16.safetensors) |

## Files

- [`motion-wan-animate-2.api.json`](motion-wan-animate-2.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`motion-wan-animate-2.json`](motion-wan-animate-2.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its loop follows Comfy's template `video_wan_animate2` at commit `cdccb2e`, and its loaders and 10 steps follow `video_wan_animate2_distilled` at commit `e7cd011`, both in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT. The node ids are the inner ids of the template's subgraph.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
