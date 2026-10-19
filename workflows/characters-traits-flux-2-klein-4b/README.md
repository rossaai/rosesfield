# Characters: a new person from chosen traits with FLUX.2 Klein 4B

Writes one prompt from the traits you choose, such as age, hair and outfit, and makes up to 4 images of one new person with FLUX.2 Klein 4B in 4 steps. Built from Comfy's template image_flux2_klein_text_to_image.

| | |
|---|---|
| Workflow id | `characters-traits-flux-2-klein-4b` |
| Run by | [`characters`](../../packages/catalog/src/characters/) |
| Core model | FLUX.2 Klein 4B |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 16.1 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `framing` | 101 `StringConcatenate` | `string_a` | a value |
| `gender` | 101 `StringConcatenate` | `string_b` | a value |
| `age` | 102 `StringConcatenate` | `string_b` | a value |
| `skinTone` | 103 `StringConcatenate` | `string_b` | a value |
| `bodyType` | 104 `StringConcatenate` | `string_b` | a value |
| `hairLength` | 105 `StringConcatenate` | `string_b` | a value |
| `hairStyle` | 106 `StringConcatenate` | `string_b` | a value |
| `hairColor` | 107 `StringConcatenate` | `string_b` | a value |
| `eyeColor` | 108 `StringConcatenate` | `string_b` | a value |
| `outfit` | 109 `StringConcatenate` | `string_b` | a value |
| `plainBackground` | 110 `StringConcatenate` | `string_b` | a value |
| `hairWiring` | 108 `StringConcatenate` | `string_a` | a link the catalog picks |
| `details` | 112 `StringConcatenate` | `string_b` | a value |
| `width` | 6 `EmptyFlux2LatentImage` | `width` | a value |
| `height` | 6 `EmptyFlux2LatentImage` | `height` | a value |
| `schedulerWidth` | 12 `Flux2Scheduler` | `width` | a value |
| `schedulerHeight` | 12 `Flux2Scheduler` | `height` | a value |
| `count` | 6 `EmptyFlux2LatentImage` | `batch_size` | a value |
| `seed` | 9 `RandomNoise` | `noise_seed` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 13 `SaveImage` | `images` | image |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `flux-2-klein-4b.safetensors` | FLUX.2 Klein 4B | [Apache-2.0](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/flux2-klein/resolve/main/split_files/diffusion_models/flux-2-klein-4b.safetensors) |
| `qwen_3_4b.safetensors` | Qwen3 4B text encoder | [Apache-2.0](https://huggingface.co/Qwen/Qwen3-4B) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors) |
| `flux2-vae.safetensors` | FLUX.2 VAE | [Apache-2.0](https://huggingface.co/Comfy-Org/flux2-dev) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/vae/flux2-vae.safetensors) |

## Files

- [`characters-traits-flux-2-klein-4b.api.json`](characters-traits-flux-2-klein-4b.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`characters-traits-flux-2-klein-4b.json`](characters-traits-flux-2-klein-4b.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `image_flux2_klein_text_to_image` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened. Nodes 101 to 112 write the prompt from the traits.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
