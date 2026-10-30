# Video: image to video with sound on LTX 2.5, with an optional last frame

Makes a clip of 2 to 5 seconds that starts from your image, with LTX 2.5 in two stages and its sound. A last frame, when you add one, guides the end of the clip in both stages. A run with no last frame drops its guides, and a run with sound off drops the audio track. Built from Comfy's templates video_ltx2_5_i2v and video_ltx2_5_flf2v.

| | |
|---|---|
| Workflow id | `video-ltx-2-5-start-frame` |
| Run by | [`video`](../../packages/catalog/src/video/) |
| Core model | LTX 2.5 22B distilled |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | LTX's system requirements name at least 32 GB of VRAM for LTX 2.5, on [docs.ltx.io](https://docs.ltx.io/open-source-model/getting-started/system-requirements). The model files it loads add up to 39.7 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `prompt` | 900 `StringConcatenate`, Prompt and camera move | `string_a` | a value |
| `cameraMove` | 900 `StringConcatenate`, Prompt and camera move | `string_b` | a value |
| `width` | 356 `EmptyLTXVLatentVideo` | `width` | a value |
| `height` | 356 `EmptyLTXVLatentVideo` | `height` | a value |
| `frames` | 356 `EmptyLTXVLatentVideo` | `length` | a value |
| `audioFrames` | 366 `LTXVEmptyLatentAudio` | `frames_number` | a value |
| `seed` | 339 `RandomNoise` | `noise_seed` | a value |
| `startFrame` | 401 `LoadImage`, Start frame | `image` | an uploaded image |
| `lastFrame` | 402 `LoadImage`, Last frame | `image` | an uploaded image |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 75 `SaveVideo` | `images` | video |

## The last frame

- The start frame is locked at frame 0 with `LTXVImgToVideoInplace`, at strength 0.7 in the first stage, node 357, and at 1.0 in the second, node 349.
- The last frame is an `LTXVAddGuide` guide at the last frame, `frame_idx` -1: at strength 0.7 in the first stage, node 460, as in Comfy's template video_ltx2_5_flf2v, and at 1.0 in the second, node 463, so the clip ends on your image. Nodes 403 and 404 scale and prepare it the way nodes 351 and 350 prepare the start frame.
- `LTXVCropGuides` removes the guide frames after each stage, nodes 462 and 465.
- A run with no last frame removes nodes 402 to 404 and the guides 460, 462, 463 and 465, and links each next node to what the guide read. The graph it sends is then the image to video graph of video_ltx2_5_i2v. The catalog's [`video-workflows.ts`](../../packages/catalog/src/video/comfy/video-workflows.ts) does it.

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

- [`video-ltx-2-5-start-frame.api.json`](video-ltx-2-5-start-frame.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`video-ltx-2-5-start-frame.json`](video-ltx-2-5-start-frame.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script writes it from the API file with the node definitions of ComfyUI v0.41.0.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `video_ltx2_5_i2v` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened. The last-frame guide and the crop guides follow `video_ltx2_5_flf2v` in the same repository, read on 2026-10-20: a guide at `frame_idx` -1 at strength 0.7, and `LTXVCropGuides` after sampling. That template renders one stage, so the guide repeats in the second stage here. The prompt enhancer is left out, so the model reads your words.

## Checked

Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
