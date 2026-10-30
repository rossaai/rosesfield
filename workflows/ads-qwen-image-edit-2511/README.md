# Ads: product shots from your product photos with Qwen Image Edit 2511

Writes one instruction from the kind of ad, the style and your words, and edits up to 3 reference images, your product photos and a character, into product shots with Qwen Image Edit 2511. Built from Comfy's template image_qwen_image_edit_2511.

| | |
|---|---|
| Workflow id | `ads-qwen-image-edit-2511` |
| Run by | [`ads`](../../packages/catalog/src/ads/) |
| Core model | Qwen Image Edit 2511 |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | The model files it loads add up to 30.2 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `prompt` | 501 `RegexReplace` | `string` | a value |
| `lineBreak` | 503 `RegexReplace` | `replace` | a value |
| `kindLead` | 504 `StringConcatenate` | `string_a` | a value |
| `style` | 504 `StringConcatenate` | `string_b` | a value |
| `wordsLead` | 505 `StringConcatenate` | `string_b` | a value |
| `wordsEnd` | 507 `StringConcatenate` | `string_b` | a value |
| `doubledStop` | 509 `RegexReplace` | `regex_pattern` | a value |
| `reference1` | 41 `LoadImage` | `image` | an uploaded image |
| `reference2` | 83 `LoadImage` | `image` | an uploaded image |
| `reference3` | 191 `LoadImage` | `image` | an uploaded image |
| `seed` | 169 `KSampler` | `seed` | a value |
| `count` | 192 `EmptySD3LatentImage` | `batch_size` | a value |
| `width` | 192 `EmptySD3LatentImage` | `width` | a value |
| `height` | 192 `EmptySD3LatentImage` | `height` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 9 `SaveImage` | `images` | image |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `qwen_image_vae.safetensors` | Qwen Image VAE | [Apache-2.0](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors) |
| `qwen_image_edit_2511_fp8mixed.safetensors` | Qwen Image Edit 2511, fp8 mixed | [Apache-2.0](https://huggingface.co/Qwen/Qwen-Image-Edit-2511) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image-Edit_ComfyUI/resolve/main/split_files/diffusion_models/qwen_image_edit_2511_fp8mixed.safetensors) |
| `qwen_2.5_vl_7b_fp8_scaled.safetensors` | Qwen2.5-VL 7B text encoder, fp8 | [Apache-2.0](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors) |

## Files

- [`ads-qwen-image-edit-2511.api.json`](ads-qwen-image-edit-2511.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`ads-qwen-image-edit-2511.json`](ads-qwen-image-edit-2511.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script writes it from the API file with the node definitions of ComfyUI v0.41.0.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `image_qwen_image_edit_2511` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened. A third reference image is wired into the edit text node.

## Checked

Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
