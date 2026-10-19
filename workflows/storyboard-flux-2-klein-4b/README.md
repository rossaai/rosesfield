# Storyboard: up to 8 matching keyframes from one image with FLUX.2 Klein 4B

Edits one anchor image, a reference or a character's photo, into one keyframe per scene with FLUX.2 Klein 4B in 4 steps, each scene with its own sentence, the shared look and its own seed, and saves the keyframes as one batch.

| | |
|---|---|
| Workflow id | `storyboard-flux-2-klein-4b` |
| Run by | [`storyboard`](../../packages/catalog/src/storyboard/) |
| Core model | FLUX.2 Klein 4B |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 12.5 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `seed` | 6 `PrimitiveInt` | `value` | a value |
| `count` | 99 `SaveImage` | `images` | a link the catalog picks |
| `width` | 11 `EmptyFlux2LatentImage` | `width` | a value |
| `height` | 11 `EmptyFlux2LatentImage` | `height` | a value |
| `schedulerWidth` | 5 `Flux2Scheduler` | `width` | a value |
| `schedulerHeight` | 5 `Flux2Scheduler` | `height` | a value |
| `anchor` | 7 `LoadImage` | `image` | an uploaded image |
| `scene1` | 100 `StringConcatenate` | `string_b` | a value |
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
| `flux-2-klein-4b-fp8.safetensors` | FLUX.2 Klein 4B, fp8 | [Apache-2.0](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/black-forest-labs/FLUX.2-klein-4b-fp8/resolve/main/flux-2-klein-4b-fp8.safetensors) |
| `qwen_3_4b.safetensors` | Qwen3 4B text encoder | [Apache-2.0](https://huggingface.co/Qwen/Qwen3-4B) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors) |
| `flux2-vae.safetensors` | FLUX.2 VAE | [Apache-2.0](https://huggingface.co/Comfy-Org/flux2-dev) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/vae/flux2-vae.safetensors) |

## Files

- [`storyboard-flux-2-klein-4b.api.json`](storyboard-flux-2-klein-4b.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`storyboard-flux-2-klein-4b.json`](storyboard-flux-2-klein-4b.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `image_flux2_klein_image_edit_4b_distilled` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened. One branch per scene, joined by `ImageBatch`.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
