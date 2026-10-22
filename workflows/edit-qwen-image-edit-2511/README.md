# Edit: change a photo by your words with Qwen Image Edit 2511

Changes your photo the way your words say with Qwen Image Edit 2511 in 40 steps, and keeps its format. Your photo is scaled to the size you pick, so the output keeps its ratio. Built from Comfy's template image_qwen_image_edit_2511.

| | |
|---|---|
| Workflow id | `edit-qwen-image-edit-2511` |
| Run by | [`edit`](../../packages/catalog/src/edit/) |
| Core model | Qwen Image Edit 2511, fp8 mixed |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `image` | 41 `LoadImage` | `image` | an uploaded image |
| `prompt` | 112 `TextEncodeQwenImageEditPlus` | `prompt` | a value |
| `megapixels` | 107 `ImageScaleToTotalPixels` | `megapixels` | a value, 0.5 or 1 |
| `seed` | 106 `KSampler` | `seed` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 9 `SaveImage` | `images` | image |

## The size

`ImageScaleToTotalPixels` scales your photo to the megapixels you pick, where one megapixel is 1024 by 1024 pixels, rounds each side to a multiple of 16 pixels, and keeps its ratio. The latent is your scaled photo through `VAEEncode`, so the output has the scaled photo's size. A 3:4 photo at 0.5 megapixels comes out at 624 by 832 pixels, exactly 3:4. A 9:16 photo at 0.5 megapixels comes out at 544 by 960 pixels, 0.7% from 9:16. A 16:9 photo at 1 megapixel comes out at 1360 by 768 pixels, 0.4% from 16:9.

The template scales with `FluxKontextImageScale`, which picks the nearest of its listed sizes, so a 9:16 photo would come out 4% wider. This graph keeps your photo's ratio instead.

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `qwen_2.5_vl_7b_fp8_scaled.safetensors` | Qwen2.5-VL 7B text encoder, fp8 | [Apache-2.0](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors) |
| `qwen_image_vae.safetensors` | Qwen Image VAE | [Apache-2.0](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors) |
| `qwen_image_edit_2511_fp8mixed.safetensors` | Qwen Image Edit 2511, fp8 mixed | [Apache-2.0](https://huggingface.co/Qwen/Qwen-Image-Edit-2511) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image-Edit_ComfyUI/resolve/main/split_files/diffusion_models/qwen_image_edit_2511_fp8mixed.safetensors) |

## Files

- [`edit-qwen-image-edit-2511.api.json`](edit-qwen-image-edit-2511.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`edit-qwen-image-edit-2511.json`](edit-qwen-image-edit-2511.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file and the node layouts of the other Qwen Image Edit 2511 UI files in this folder. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `image_qwen_image_edit_2511` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, with the subgraphs opened and the Lightning switch off: shift 3.1, CFG normalization at 1, the edit text encoder for your words and for an empty negative, the reference latent method `index_timestep_zero`, and 40 steps at cfg 4 with euler and simple. The image scale is `ImageScaleToTotalPixels` in place of `FluxKontextImageScale`, per §The size.

## Not checked

No run of this workflow on a live engine exists. Every class name and input name it uses is in the `object_info` Comfy Cloud answered on 2026-10-19, and every model file it loads is in that answer's model folders.
