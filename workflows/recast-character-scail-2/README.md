# Recast: put your character into a clip with SCAIL 2

Finds the person in your clip with SAM 3.1, then renders your character in their place with SCAIL 2 on Wan 2.1, keeping the motion and timing of the clip. Draft runs 6 steps with the step-distill LoRA, final runs 40. Built from Comfy's template video_wan21_scail2_character_replacement.

| | |
|---|---|
| Workflow id | `recast-character-scail-2` |
| Run by | [`recast`](../../packages/catalog/src/recast/), [`remake`](../../packages/catalog/src/remake/) |
| Core model | SCAIL-2 on Wan 2.1 14B |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 44.8 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `source` | 1 `LoadVideo` | `file` | an uploaded video |
| `character` | 11 `LoadImage` | `image` | an uploaded image |
| `seed` | 34 `SamplerCustom` | `noise_seed` | a value |
| `secondSeed` | 44 `SamplerCustom` | `noise_seed` | a value |
| `distillStrength` | 17 `LoraLoaderModelOnly` | `strength_model` | a value |
| `steps` | 20 `BasicScheduler` | `steps` | a value |
| `cfg` | 34 `SamplerCustom` | `cfg` | a value |
| `secondCfg` | 44 `SamplerCustom` | `cfg` | a value |
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
| `wan2.1_14B_SCAIL_2_fp16.safetensors` | SCAIL-2 on Wan 2.1 14B | [MIT](https://huggingface.co/zai-org/SCAIL-2) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/SCAIL-2/resolve/main/diffusion_models/wan2.1_14B_SCAIL_2_fp16.safetensors) |
| `wan2.1_SCAIL_2_DPO_lora_bf16.safetensors` | SCAIL-2 DPO LoRA | [MIT](https://huggingface.co/zai-org/SCAIL-2) | `models/loras` | [Hugging Face](https://huggingface.co/Comfy-Org/SCAIL-2/resolve/main/loras/wan2.1_SCAIL_2_DPO_lora_bf16.safetensors) |
| `lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors` | lightx2v Wan 2.1 I2V 480P step-distill LoRA | [Apache-2.0](https://huggingface.co/lightx2v/Wan2.1-I2V-14B-480P-StepDistill-CfgDistill-Lightx2v) | `models/loras` | [Hugging Face](https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Lightx2v/lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors) |
| `umt5_xxl_fp8_e4m3fn_scaled.safetensors` | umt5-xxl text encoder, fp8 | [Apache-2.0](https://huggingface.co/google/umt5-xxl) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors) |
| `Wan2_1_VAE_bf16.safetensors` | Wan 2.1 VAE, Kijai's build | [Apache-2.0](https://huggingface.co/Wan-AI/Wan2.1-I2V-14B-480P) | `models/vae` | [Hugging Face](https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Wan2_1_VAE_bf16.safetensors) |
| `clip_vision_h.safetensors` | CLIP ViT-H vision encoder | [MIT](https://huggingface.co/laion/CLIP-ViT-H-14-laion2B-s32B-b79K) | `models/clip_vision` | [Hugging Face](https://huggingface.co/Comfy-Org/Wan-Animate-2/resolve/main/clip_vision/clip_vision_h.safetensors) |

## Files

- [`recast-character-scail-2.api.json`](recast-character-scail-2.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`recast-character-scail-2.json`](recast-character-scail-2.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `video_wan21_scail2_character_replacement` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened.

SAM 3.1 runs under the SAM License, and its text travels beside these workflows as [`../sam-license.txt`](../sam-license.txt).

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
