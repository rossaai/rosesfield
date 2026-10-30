# Angles: a set of 4 views of a subject with Qwen Image Edit 2511

Draws your subject from 4 views in one run, one branch of Qwen Image Edit 2511 with the Multiple Angles LoRA and the Lightning LoRA per view, and saves the 4 images as one batch. Each branch sets its side, height, distance and seed.

| | |
|---|---|
| Workflow id | `angles-set-qwen-image-edit-2511` |
| Run by | [`angles`](../../packages/catalog/src/angles/) |
| Core model | Qwen Image Edit 2511 with the Multiple Angles LoRA |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | The model files it loads add up to 51.6 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `image` | 41 `LoadImage` | `image` | an uploaded image |
| `side1` | 1120 `StringConcatenate` | `string_a` | a value |
| `height1` | 1120 `StringConcatenate` | `string_b` | a value |
| `distance1` | 1121 `StringConcatenate` | `string_b` | a value |
| `seed1` | 1106 `KSampler` | `seed` | a value |
| `side2` | 2120 `StringConcatenate` | `string_a` | a value |
| `height2` | 2120 `StringConcatenate` | `string_b` | a value |
| `distance2` | 2121 `StringConcatenate` | `string_b` | a value |
| `seed2` | 2106 `KSampler` | `seed` | a value |
| `side3` | 3120 `StringConcatenate` | `string_a` | a value |
| `height3` | 3120 `StringConcatenate` | `string_b` | a value |
| `distance3` | 3121 `StringConcatenate` | `string_b` | a value |
| `seed3` | 3106 `KSampler` | `seed` | a value |
| `side4` | 4120 `StringConcatenate` | `string_a` | a value |
| `height4` | 4120 `StringConcatenate` | `string_b` | a value |
| `distance4` | 4121 `StringConcatenate` | `string_b` | a value |
| `seed4` | 4106 `KSampler` | `seed` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 9 `SaveImage` | `images` | image |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `qwen_2.5_vl_7b_fp8_scaled.safetensors` | Qwen2.5-VL 7B text encoder, fp8 | [Apache-2.0](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors) |
| `qwen_image_vae.safetensors` | Qwen Image VAE | [Apache-2.0](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors) |
| `Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors` | Qwen Image Edit 2511 Lightning 4-step LoRA, by lightx2v | [Apache-2.0](https://huggingface.co/lightx2v/Qwen-Image-Edit-2511-Lightning) | `models/loras` | [Hugging Face](https://huggingface.co/lightx2v/Qwen-Image-Edit-2511-Lightning/resolve/main/Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors) |
| `qwen_image_edit_2511_bf16.safetensors` | Qwen Image Edit 2511, bf16 | [Apache-2.0](https://huggingface.co/Qwen/Qwen-Image-Edit-2511) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image-Edit_ComfyUI/resolve/main/split_files/diffusion_models/qwen_image_edit_2511_bf16.safetensors) |
| `qwen-image-edit-2511-multiple-angles-lora.safetensors` | Qwen Image Edit 2511 Multiple Angles LoRA, by fal | [Apache-2.0](https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA) | `models/loras` | [Hugging Face](https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA/resolve/main/qwen-image-edit-2511-multiple-angles-lora.safetensors) |

## Files

- [`angles-set-qwen-image-edit-2511.api.json`](angles-set-qwen-image-edit-2511.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`angles-set-qwen-image-edit-2511.json`](angles-set-qwen-image-edit-2511.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script writes it from the API file with the node definitions of ComfyUI v0.41.0.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Four copies of the branch of `angles-qwen-image-edit-2511`, one per view, with node ids 1000, 2000, 3000 and 4000 higher, joined by `ImageBatch`.

## Checked

Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
