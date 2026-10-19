# Shot: a directed shot with sound on LTX 2.5

Renders one shot from your prompt and seven choices written as sentences: the movement, the camera, the lens, the focus, the light, the color and the mood. LTX 2.5 runs it in two stages and makes its sound. A run with sound off drops the audio track. Built from Comfy's template video_ltx2_5_t2v.

| | |
|---|---|
| Workflow id | `shot-ltx-2-5` |
| Run by | [`shot`](../../packages/catalog/src/shot/) |
| Core model | LTX 2.5 22B distilled |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. LTX's system requirements name at least 32 GB of VRAM for LTX 2.5, on [docs.ltx.io](https://docs.ltx.io/open-source-model/getting-started/system-requirements). The model files it loads add up to 39.7 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `prompt` | 900 `StringTrim` | `string` | a value |
| `movement` | 902 `StringConcatenate` | `string_b` | a value |
| `camera` | 903 `StringConcatenate` | `string_b` | a value |
| `lens` | 904 `StringConcatenate` | `string_b` | a value |
| `focus` | 905 `StringConcatenate` | `string_b` | a value |
| `light` | 906 `StringConcatenate` | `string_b` | a value |
| `color` | 907 `StringConcatenate` | `string_b` | a value |
| `mood` | 908 `StringConcatenate` | `string_b` | a value |
| `seconds` | 362 `PrimitiveInt` | `value` | a value |
| `width` | 372 `PrimitiveInt` | `value` | a value |
| `height` | 360 `PrimitiveInt` | `value` | a value |
| `seed` | 339 `RandomNoise` | `noise_seed` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 75 `SaveVideo` | `images` | video |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors` | LTX 2.5 latent upscaler, 2 times | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | `models/latent_upscale_models` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.5/resolve/main/latent_upscale_models/ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors) |
| `ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors` | LTX 2.5 22B distilled, int8 | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.5/resolve/main/diffusion_models/ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors) |
| `ltx-2.5-video-vae-bf16.safetensors` | LTX 2.5 video VAE | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | `models/vae` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.5/resolve/main/vae/ltx-2.5-video-vae-bf16.safetensors) |
| `ltx-2.5-audio-vae-bf16.safetensors` | LTX 2.5 audio VAE | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | `models/vae` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.5/resolve/main/vae/ltx-2.5-audio-vae-bf16.safetensors) |
| `gemma4-12b-with-proj-ltx-2.5-comfy-int8-convrot.safetensors` | Gemma 4 12B text encoder with the LTX 2.5 projections, int8 | [the licence of the LTX 2.5 repository it sits in](https://huggingface.co/Lightricks/LTX-2.5) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.5/resolve/main/text_encoders/gemma4-12b-with-proj-ltx-2.5-comfy-int8-convrot.safetensors) |

Lightricks' LTX 2.5 files are gated on Hugging Face, so their SHA256 digests are not in the UI file. Accept the LTX 2.5 licence on Hugging Face before you download them.

## Files

- [`shot-ltx-2-5.api.json`](shot-ltx-2-5.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`shot-ltx-2-5.json`](shot-ltx-2-5.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `video_ltx2_5_t2v` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened. The prompt enhancer is left out, so the model reads your words. The graph holds no `ResolutionSelector`. The catalog sets the width and the height from its own table, in multiples of 64, because the first stage halves them and `EmptyLTXVLatentVideo` floors each side to a multiple of 32 before the 2 times upscaler. A multiple of 64 comes out of the upscaler at the size it went in.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
