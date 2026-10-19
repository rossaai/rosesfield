# Effects: one photo to a short effect video on LTX 2.5

Locks your photo at frame 0, makes a matte of its subject, builds an end frame for the effect and renders one continuous shot in two stages. This file holds the rain recipe: an end frame from the Water-Simulation IC-LoRA and the photo held at the last frame through the subject matte. The other 7 recipes change it in the catalog.

| | |
|---|---|
| Workflow id | `effects-ltx-2-5` |
| Run by | [`effects`](../../packages/catalog/src/effects/) |
| Core model | LTX 2.5 22B distilled |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. LTX's system requirements name at least 32 GB of VRAM for LTX 2.5, on [docs.ltx.io](https://docs.ltx.io/open-source-model/getting-started/system-requirements). The model files it loads add up to 41.1 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `photo` | 395 `LoadImage`, Photo | `image` | an uploaded image |
| `detail` | 502 `StringConcatenate`, Detail | `string_b` | a value |
| `seed` | 339 `RandomNoise`, Seed | `noise_seed` | a value |
| `frames` | 356 `EmptyLTXVLatentVideo`, Size and length | `length` | a value |
| `audioFrames` | 366 `LTXVEmptyLatentAudio` | `frames_number` | a value |
| `width` | 356 `EmptyLTXVLatentVideo`, Size and length | `width` | a value |
| `height` | 356 `EmptyLTXVLatentVideo`, Size and length | `height` | a value |
| `endFrameSeed` | 439 `RandomNoise`, End-frame seed | `noise_seed` | a value |
| `endFrameWidth` | 433 `EmptyLTXVLatentVideo`, End-frame size | `width` | a value |
| `endFrameHeight` | 433 `EmptyLTXVLatentVideo`, End-frame size | `height` | a value |

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
| `birefnet.safetensors` | BiRefNet, by ZhengPeng7 | [MIT](https://huggingface.co/ZhengPeng7/BiRefNet) | `models/background_removal` | [Hugging Face](https://huggingface.co/Comfy-Org/BiRefNet/resolve/main/background_removal/birefnet.safetensors) |
| `ltx-2.5-22b-ic-lora-water-simulation-0.9.safetensors` | LTX 2.5 IC-LoRA Water Simulation, by Lightricks | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | `models/loras` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.5-22b-IC-LoRA-Water-Simulation/resolve/f698d6801a673c636a2c5165ffa07737d7964691/ltx-2.5-22b-ic-lora-water-simulation-0.9.safetensors) |

A recipe adds one of these files to the graph:

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `ltx-2.5-22b-ic-lora-day-to-night-0.9.safetensors` | LTX 2.5 IC-LoRA Day To Night, by Lightricks | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | `models/loras` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.5-22b-IC-LoRA-Day-To-Night/resolve/52aac758c153f9a74a6f6fe08cf92d2167f3c184/ltx-2.5-22b-ic-lora-day-to-night-0.9.safetensors) |
| `ltx-2.5-22b-lora-cinemagraph-0.9.safetensors` | LTX 2.5 LoRA Cinemagraph, by Lightricks | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | `models/loras` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.5-22b-LoRA-Cinemagraph/resolve/8e5e88efcf59ff0efa6f9dcf7164c7a7d72c4022/ltx-2.5-22b-lora-cinemagraph-0.9.safetensors) |
| `ltx-2.5-22b-lora-slow-motion-control-1.0.safetensors` | LTX 2.5 LoRA Slow Motion Control, by Lightricks | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | `models/loras` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.5-22b-LoRA-Slow-Motion-Control/resolve/c7a014b985023874de6000fc791b959dbd46a0a8/ltx-2.5-22b-lora-slow-motion-control-1.0.safetensors) |

Lightricks' LTX 2.5 files are gated on Hugging Face, so their SHA256 digests are not in the UI file. Accept the LTX 2.5 licence on Hugging Face before you download them.

## The 8 effects

Each effect is a recipe in [`effect-recipes.ts`](../../packages/catalog/src/effects/comfy/effect-recipes.ts): its prompt, its sound line, its adapter with its strength and trigger, its end-frame source, its end strength and its hold strength. These are starting values. None has run.

| Effect | Adapter | End frame | End strength | Hold strength |
|---|---|---|---|---|
| `confetti-burst` | none | none | none | 0.6 |
| `day-to-night` | `ltx-2.5-22b-ic-lora-day-to-night-0.9.safetensors` in the end-frame pass, strength 1 | the IC-LoRA pass | 0.8 | none |
| `frost-over` | none | none | none | 0.6 |
| `ink-bloom` | none | computed from the photo | 0.8 | none |
| `living-photo` | `ltx-2.5-22b-lora-cinemagraph-0.9.safetensors` on the model, strength 1 | none | none | none |
| `overgrown` | none | none | none | 0.5 |
| `rain` | `ltx-2.5-22b-ic-lora-water-simulation-0.9.safetensors` in the end-frame pass, strength 1 | the IC-LoRA pass | 0.7 | 0.5 |
| `weightless` | `ltx-2.5-22b-lora-slow-motion-control-1.0.safetensors` on the model, strength 1 | none | none | none |

`light-sweep` sits on a reserve list with its prompt, and the app does not offer it. `living-photo` makes no sound, so the app hides the sound switch for it.

## What every run does

1. It locks your photo at frame 0 with `LTXVImgToVideoInplace` at strength 1.0, in both stages, nodes 357 and 349.
2. It makes a matte of the photo's subject with the core BiRefNet nodes `LoadBackgroundRemovalModel` and `RemoveBackground`, nodes 410 to 412.
3. It builds the effect's end frame. The IC-LoRA pass, nodes 430 to 447, repeats the photo into a still clip of 9 frames, guides an LTX 2.5 run with the adapter on that clip and keeps the last frame. The computed source, nodes 450 to 455, turns the photo into grey ink tones on cream paper with core image nodes.
4. It renders one continuous shot in two stages. The end frame is an `LTXVAddGuide` guide at the last frame, nodes 460 and 463. The photo is a second guide at the last frame with the subject matte as its `attention_mask`, nodes 461 and 464, so the subject holds while the scene changes. `LTXVCropGuides` removes the guide frames after each stage, nodes 462 and 465.

## How a recipe changes this file

This file holds the rain recipe with sound on. The catalog's [`effect-graph.ts`](../../packages/catalog/src/effects/comfy/effect-graph.ts) derives the other graphs from it:

- An effect with no end frame removes nodes 430 to 447 and the guides 460 and 463, and links the next node to what the guide read.
- `ink-bloom` removes the IC-LoRA pass and adds nodes 450 to 455, which feed both end-frame guides.
- `living-photo` and `weightless` add node 420, a `LoraLoaderModelOnly` with the motion adapter between the model and both guiders.
- An effect with no hold removes the guides 461 and 464 and the matte nodes 410 to 412.
- An effect with no guide at all removes the crop nodes 462 and 465.
- Sound off removes node 358 and the audio link of node 370, and drops the sound line from the prompt.
- The prompt-only fallback of every effect keeps only the frame 0 lock and the two-stage render.

The UI file holds nodes 420 and 450 to 455 muted, so you can see them and turn them on. It also holds a muted `MaskPreview` on the matte and a muted `PreviewImage` on the end frame.

## Tests to run first

Nothing in this workflow has run. Once a key exists, run each test once and keep the prompt-only recipe as the measured fallback of each effect:

1. Does Comfy Cloud run this graph as written, with the gated LTX 2.5 files and the four adapters?
2. Does the frame 0 lock hold your photo at strength 1.0 in both stages?
3. Does the masked hold guide keep the subject, and does a strength below 0.5 leave the scene free to change?
4. Does each IC-LoRA pass on a still clip of 9 frames make a usable end frame? `GetICLoRAParameters` reads the adapter's `reference_downscale_factor`, and the end-frame size is a multiple of 64 so a factor of 2 fits.
5. Do the trigger phrases match the adapter cards? The cards sit behind Hugging Face's licence gate and were not read. `ADD WATER` comes from the trigger examples in the [LTX IC-LoRA guide](https://docs.ltx.io/open-source-model/usage-guides/ic-lo-ra). The other three triggers are empty.
6. Does each motion adapter at strength 1.0 change the motion the way its name says?

## Use restrictions

The LTX-2.x Community License asks Rosesfield to pass its use restrictions to you. They include a statement that the output is machine generated and a ban on deepfakes made without consent. The licence is free for an entity under 10,000,000 USD of annual revenue and needs a paid agreement above that. Read it at [LICENSE-2_x](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x).

## Files

- [`effects-ltx-2-5.api.json`](effects-ltx-2-5.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`effects-ltx-2-5.json`](effects-ltx-2-5.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Written for Rosesfield from ComfyUI core nodes. Its two-stage render follows Comfy's template `video_ltx2_5_i2v`, and its IC-LoRA pass follows the wiring of Comfy's template `video_ltx2_3_ic_lora`, both in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17. Lightricks' own example workflows carry the LTX-2 Community License and were not used.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
