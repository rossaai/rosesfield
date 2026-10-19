# Storyboard: up to 8 matching keyframes from text with Qwen Image 2512 and Qwen Image Edit 2511

Makes the first keyframe from its scene and the look with Qwen Image 2512, then edits it into one keyframe per later scene with Qwen Image Edit 2511, and saves the keyframes as one batch.

| | |
|---|---|
| Workflow id | `storyboard-qwen-image-edit-2511-from-text` |
| Run by | [`storyboard`](../../packages/catalog/src/storyboard/) |
| Core model | Qwen Image Edit 2511 and Qwen Image 2512 |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 50.6 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `seed` | 6 `PrimitiveInt` | `value` | a value |
| `count` | 99 `SaveImage` | `images` | a link the catalog picks |
| `width` | 11 `EmptySD3LatentImage` | `width` | a value |
| `height` | 11 `EmptySD3LatentImage` | `height` | a value |
| `scene1` | 101 `StringConcatenate` | `string_a` | a value |
| `look1` | 101 `StringConcatenate` | `string_b` | a value |
| `scene2` | 200 `StringConcatenate` | `string_b` | a value |
| `look2` | 201 `StringConcatenate` | `string_b` | a value |
| `scene3` | 300 `StringConcatenate` | `string_b` | a value |
| `look3` | 301 `StringConcatenate` | `string_b` | a value |
| `scene4` | 400 `StringConcatenate` | `string_b` | a value |
| `look4` | 401 `StringConcatenate` | `string_b` | a value |
| `scene5` | 500 `StringConcatenate` | `string_b` | a value |
| `look5` | 501 `StringConcatenate` | `string_b` | a value |
| `scene6` | 600 `StringConcatenate` | `string_b` | a value |
| `look6` | 601 `StringConcatenate` | `string_b` | a value |
| `scene7` | 700 `StringConcatenate` | `string_b` | a value |
| `look7` | 701 `StringConcatenate` | `string_b` | a value |
| `scene8` | 800 `StringConcatenate` | `string_b` | a value |
| `look8` | 801 `StringConcatenate` | `string_b` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 99 `SaveImage` | `images` | image |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `qwen_image_edit_2511_fp8mixed.safetensors` | Qwen Image Edit 2511, fp8 mixed | [Apache-2.0](https://huggingface.co/Qwen/Qwen-Image-Edit-2511) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image-Edit_ComfyUI/resolve/main/split_files/diffusion_models/qwen_image_edit_2511_fp8mixed.safetensors) |
| `qwen_2.5_vl_7b_fp8_scaled.safetensors` | Qwen2.5-VL 7B text encoder, fp8 | [Apache-2.0](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors) |
| `qwen_image_vae.safetensors` | Qwen Image VAE | [Apache-2.0](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors) |
| `qwen_image_2512_fp8_e4m3fn.safetensors` | Qwen Image 2512, fp8 | [Apache-2.0](https://huggingface.co/Qwen/Qwen-Image-2512) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/diffusion_models/qwen_image_2512_fp8_e4m3fn.safetensors) |

## Files

- [`storyboard-qwen-image-edit-2511-from-text.api.json`](storyboard-qwen-image-edit-2511-from-text.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`storyboard-qwen-image-edit-2511-from-text.json`](storyboard-qwen-image-edit-2511-from-text.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's templates `image_qwen_image_edit_2511` and `image_qwen_Image_2512` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened. One branch per scene, joined by `ImageBatch`.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
