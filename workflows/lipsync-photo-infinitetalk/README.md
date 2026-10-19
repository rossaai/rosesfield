# Lip sync: a talking video from a photo and audio with InfiniteTalk

Makes a video of the person in your photo speaking your audio with the core WanInfiniteTalkToVideo node on Wan 2.1 I2V 14B in single-speaker mode, in up to 4 passes that each continue from the last frames of the one before, then trims the video to the length of the audio. Built from Comfy's template video_wan2_1_infinitetalk.

| | |
|---|---|
| Workflow id | `lipsync-photo-infinitetalk` |
| Run by | [`lipsync`](../../packages/catalog/src/lipsync/) |
| Core model | InfiniteTalk on Wan 2.1 I2V 14B 480P |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 29.7 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `photo` | 1 `LoadImage` | `image` | an uploaded image |
| `audio` | 2 `LoadAudio` | `audio` | an uploaded audio |
| `scene` | 9 `CLIPTextEncode` | `text` | a value |
| `seed1` | 102 `RandomNoise` | `noise_seed` | a value |
| `width1` | 101 `WanInfiniteTalkToVideo` | `width` | a value |
| `height1` | 101 `WanInfiniteTalkToVideo` | `height` | a value |
| `frames1` | 101 `WanInfiniteTalkToVideo` | `length` | a value |
| `seed2` | 202 `RandomNoise` | `noise_seed` | a value |
| `width2` | 201 `WanInfiniteTalkToVideo` | `width` | a value |
| `height2` | 201 `WanInfiniteTalkToVideo` | `height` | a value |
| `frames2` | 201 `WanInfiniteTalkToVideo` | `length` | a value |
| `seed3` | 302 `RandomNoise` | `noise_seed` | a value |
| `width3` | 301 `WanInfiniteTalkToVideo` | `width` | a value |
| `height3` | 301 `WanInfiniteTalkToVideo` | `height` | a value |
| `frames3` | 301 `WanInfiniteTalkToVideo` | `length` | a value |
| `seed4` | 402 `RandomNoise` | `noise_seed` | a value |
| `width4` | 401 `WanInfiniteTalkToVideo` | `width` | a value |
| `height4` | 401 `WanInfiniteTalkToVideo` | `height` | a value |
| `frames4` | 401 `WanInfiniteTalkToVideo` | `length` | a value |
| `length` | 900 `ImageFromBatch` | `length` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 902 `SaveVideo` | `images` | video |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `Wan2_1-I2V-14B-480p_fp8_e4m3fn_scaled_KJ.safetensors` | Wan 2.1 I2V 14B 480P, fp8, Kijai's build | [Apache-2.0](https://huggingface.co/Wan-AI/Wan2.1-I2V-14B-480P) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Kijai/WanVideo_comfy_fp8_scaled/resolve/main/I2V/Wan2_1-I2V-14B-480p_fp8_e4m3fn_scaled_KJ.safetensors) |
| `lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors` | lightx2v Wan 2.1 I2V 480P step-distill LoRA | [Apache-2.0](https://huggingface.co/lightx2v/Wan2.1-I2V-14B-480P-StepDistill-CfgDistill-Lightx2v) | `models/loras` | [Hugging Face](https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Lightx2v/lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors) |
| `wan2.1_infiniteTalk_single_fp16.safetensors` | InfiniteTalk single-speaker patch | [Apache-2.0](https://huggingface.co/MeiGen-AI/InfiniteTalk) | `models/model_patches` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/model_patches/wan2.1_infiniteTalk_single_fp16.safetensors) |
| `wav2vec2-chinese-base_fp16.safetensors` | chinese-wav2vec2-base audio encoder | [MIT](https://huggingface.co/TencentGameMate/chinese-wav2vec2-base) | `models/audio_encoders` | [Hugging Face](https://huggingface.co/Kijai/wav2vec2_safetensors/resolve/main/wav2vec2-chinese-base_fp16.safetensors) |
| `umt5_xxl_fp8_e4m3fn_scaled.safetensors` | umt5-xxl text encoder, fp8 | [Apache-2.0](https://huggingface.co/google/umt5-xxl) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors) |
| `Wan2_1_VAE_bf16.safetensors` | Wan 2.1 VAE, Kijai's build | [Apache-2.0](https://huggingface.co/Wan-AI/Wan2.1-I2V-14B-480P) | `models/vae` | [Hugging Face](https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Wan2_1_VAE_bf16.safetensors) |

## Files

- [`lipsync-photo-infinitetalk.api.json`](lipsync-photo-infinitetalk.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`lipsync-photo-infinitetalk.json`](lipsync-photo-infinitetalk.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `video_wan2_1_infinitetalk` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened. It runs the node's single-speaker mode.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
