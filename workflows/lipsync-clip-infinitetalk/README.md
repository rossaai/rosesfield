# Lip sync: a clip redubbed to new audio with InfiniteTalk

Makes the person in your clip speak your audio with InfiniteTalk through the ComfyUI-WanVideoWrapper nodes on Wan 2.1 I2V 14B, keeping the clip's motion, then trims the video to the length of the audio. Built from the wrapper's example wanvideo_2_1_14B_V2V_InfiniteTalk_example_02.

| | |
|---|---|
| Workflow id | `lipsync-clip-infinitetalk` |
| Run by | [`lipsync`](../../packages/catalog/src/lipsync/) |
| Core model | InfiniteTalk on Wan 2.1 I2V 14B 480P |
| Custom node packs | [ComfyUI-WanVideoWrapper](https://github.com/kijai/ComfyUI-WanVideoWrapper) at commit `088128b224242e110d3906c6750e9a3a348a659b`, Apache-2.0 |
| GPU memory | Not measured. The model files it loads add up to 35.6 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `clip` | 1 `LoadVideo` | `file` | an uploaded video |
| `audio` | 2 `LoadAudio` | `audio` | an uploaded audio |
| `seed` | 21 `WanVideoSampler` | `seed` | a value |
| `resizeWidth` | 4 `ImageScale` | `width` | a value |
| `resizeHeight` | 4 `ImageScale` | `height` | a value |
| `width` | 19 `WanVideoImageToVideoMultiTalk` | `width` | a value |
| `height` | 19 `WanVideoImageToVideoMultiTalk` | `height` | a value |
| `frames` | 15 `MultiTalkWav2VecEmbeds` | `num_frames` | a value |
| `length` | 900 `ImageFromBatch` | `length` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 902 `SaveVideo` | `images` | video |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `Wan2_1-InfiniTetalk-Single_fp16.safetensors` | InfiniteTalk single-speaker patch, Kijai's build | [Apache-2.0](https://huggingface.co/MeiGen-AI/InfiniteTalk) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/InfiniteTalk/Wan2_1-InfiniTetalk-Single_fp16.safetensors) |
| `lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors` | lightx2v Wan 2.1 I2V 480P step-distill LoRA | [Apache-2.0](https://huggingface.co/lightx2v/Wan2.1-I2V-14B-480P-StepDistill-CfgDistill-Lightx2v) | `models/loras` | [Hugging Face](https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Lightx2v/lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors) |
| `Wan2_1-I2V-14B-480p_fp8_e4m3fn_scaled_KJ.safetensors` | Wan 2.1 I2V 14B 480P, fp8, Kijai's build | [Apache-2.0](https://huggingface.co/Wan-AI/Wan2.1-I2V-14B-480P) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Kijai/WanVideo_comfy_fp8_scaled/resolve/main/I2V/Wan2_1-I2V-14B-480p_fp8_e4m3fn_scaled_KJ.safetensors) |
| `Wan2_1_VAE_bf16.safetensors` | Wan 2.1 VAE, Kijai's build | [Apache-2.0](https://huggingface.co/Wan-AI/Wan2.1-I2V-14B-480P) | `models/vae` | [Hugging Face](https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Wan2_1_VAE_bf16.safetensors) |
| `wav2vec2-chinese-base_fp16.safetensors` | chinese-wav2vec2-base audio encoder | [MIT](https://huggingface.co/TencentGameMate/chinese-wav2vec2-base) | `models/audio_encoders` | [Hugging Face](https://huggingface.co/Kijai/wav2vec2_safetensors/resolve/main/wav2vec2-chinese-base_fp16.safetensors) |
| `clip_vision_h.safetensors` | CLIP ViT-H vision encoder | [MIT](https://huggingface.co/laion/CLIP-ViT-H-14-laion2B-s32B-b79K) | `models/clip_vision` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan-Animate-2/resolve/main/clip_vision/clip_vision_h.safetensors) |
| `umt5-xxl-enc-bf16.safetensors` | umt5-xxl encoder, Kijai's build | [Apache-2.0](https://huggingface.co/google/umt5-xxl) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/umt5-xxl-enc-bf16.safetensors) |

## Files

- [`lipsync-clip-infinitetalk.api.json`](lipsync-clip-infinitetalk.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`lipsync-clip-infinitetalk.json`](lipsync-clip-infinitetalk.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow the example `wanvideo_2_1_14B_V2V_InfiniteTalk_example_02.json` of [kijai/ComfyUI-WanVideoWrapper](https://github.com/kijai/ComfyUI-WanVideoWrapper), Apache-2.0, at commit `088128b224242e110d3906c6750e9a3a348a659b`. Its video loader and writer are ComfyUI core nodes, and its vocal separator is left out.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0 and the pinned node pack, read from source.
