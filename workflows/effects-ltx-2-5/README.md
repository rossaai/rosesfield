# Effects: one photo to a short effect video on LTX 2.5

Locks your photo at frame 0, makes a matte of its subject, draws an end frame for the effect and renders one continuous shot in two stages on LTX 2.5. LTX 2.5 is the only video model. This file holds every part a recipe can use: an end frame drawn from the photo by FLUX.2 Klein 4B, and the subject held at the last frame through its matte. Each recipe in the catalog removes the parts it does not use.

| | |
|---|---|
| Workflow id | `effects-ltx-2-5` |
| Run by | [`effects`](../../packages/catalog/src/effects/) |
| Core model | LTX 2.5 22B distilled |
| Custom node packs | none, every node is a ComfyUI core node |
| Adapters | none. Comfy Cloud holds no LTX 2.5 adapter, so no recipe loads one |
| GPU memory | Not measured. LTX's system requirements name at least 32 GB of VRAM for LTX 2.5, on [docs.ltx.io](https://docs.ltx.io/open-source-model/getting-started/system-requirements). |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `photo` | 395 `LoadImage`, Photo | `image` | an uploaded image |
| `detail` | 501 `StringConcatenate`, Prompt and detail | `string_b` | a value |
| `seed` | 339 `RandomNoise`, Seed | `noise_seed` | a value |
| `width` | 356 `EmptyLTXVLatentVideo`, Size and length | `width` | a value |
| `height` | 356 `EmptyLTXVLatentVideo`, Size and length | `height` | a value |
| `endFrameSeed` | 532 `RandomNoise`, End-frame seed | `noise_seed` | a value |

The recipe sets the rest: the prompt on node 501, the length on nodes 356 and 366, the end-frame prompt on node 523 and the strengths on nodes 460, 461, 463 and 464.

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
| `flux-2-klein-4b.safetensors` | FLUX.2 Klein 4B, for the end frame | [Apache-2.0](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/flux2-klein/resolve/main/split_files/diffusion_models/flux-2-klein-4b.safetensors) |
| `qwen_3_4b.safetensors` | Qwen3 4B text encoder, for the end frame | [Apache-2.0](https://huggingface.co/Qwen/Qwen3-4B) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors) |
| `flux2-vae.safetensors` | FLUX.2 VAE, for the end frame | Not settled. See below | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/vae-text-encorder-for-flux-klein-4b/resolve/main/split_files/vae/flux2-vae.safetensors) |

Lightricks' LTX 2.5 files are gated on Hugging Face, so their SHA256 digests are not in the UI file. Accept the LTX 2.5 licence on Hugging Face before you download them.

The licence of `flux2-vae.safetensors` is not settled. Two files carry that name, and the graph names the file only:

- [Comfy-Org/vae-text-encorder-for-flux-klein-4b](https://huggingface.co/Comfy-Org/vae-text-encorder-for-flux-klein-4b), where the download link points, tags its repository `apache-2.0`. Its file has the SHA256 `868fe7b343cc8f3a19dbcfcafbc3d5f888802be3f89bd81b65b3621a066ce8f3`.
- [Comfy-Org/flux2-dev](https://huggingface.co/Comfy-Org/flux2-dev) tags its repository `flux-1-dev-non-commercial-license`. Its file has the SHA256 `d64f3a68e1cc4f9f4e29b6e0da38a0204fe9a49f2d4053f0ec1fa1ca02f9c4b5`.

Black Forest Labs' own [FLUX.2-klein-4B](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B) repository is tagged `apache-2.0` and holds its VAE in the diffusers format, not as this file. Which of the two files Comfy Cloud loads under this name is not known. The tags and digests were read from the Hugging Face API on 2026-10-19.

## The effects

Each effect is a recipe kept as data in [`packages/catalog/src/effects/recipes/`](../../packages/catalog/src/effects/recipes/): its prompt, its end-frame source and prompt, its end-frame strength, its hold strength, its adapter, which is always none, its length and whether it passed. A recipe passes when a blind review scores its runs, and a passed recipe names the run it passed with. Effects offers only the passed recipes. While none has passed, Effects takes no run.

| End-frame source | What the graph does |
|---|---|
| `none` | no end frame. The video runs on the prompt and the frame 0 lock |
| `edit` | FLUX.2 Klein 4B edits your photo into the end of the effect, with the photo as its reference latent |
| `draw` | FLUX.2 Klein 4B draws the end of the effect from its prompt alone, at the size of your photo |

## What every run does

1. It locks your photo at frame 0 with `LTXVImgToVideoInplace`: at strength 0.7 in the first stage, node 357, and at 1.0 in the second, node 349. The second lock keeps frame 0 your photo.
2. It makes a matte of the photo's subject with the core BiRefNet nodes `LoadBackgroundRemovalModel` and `RemoveBackground`, nodes 410 to 412, when the recipe holds the subject.
3. It makes the effect's end frame with FLUX.2 Klein 4B in 4 steps, nodes 520 to 536, when the recipe has one. Node 525 scales the photo to one megapixel, and the end frame keeps that size.
4. It renders one continuous shot in two stages. The end frame is an `LTXVAddGuide` guide at the last frame, nodes 460 and 463. The photo is a second guide at the last frame with the subject matte as its `attention_mask`, nodes 461 and 464, so the subject holds while the scene changes. `LTXVCropGuides` removes the guide frames after each stage, nodes 462 and 465.
5. It saves the video with no sound. Every recipe removes the audio decode, node 358.

## How a recipe changes this file

The catalog's [`effect-graph.ts`](../../packages/catalog/src/effects/comfy/effect-graph.ts) derives each recipe's graph from this file:

- It writes the recipe's prompt on node 501 and its length on nodes 356 and 366.
- An effect with no end frame removes nodes 520 to 536 and the guides 460 and 463, and links the next node to what the guide read.
- An end frame drawn from its prompt removes the reference nodes 527 to 529 and guides node 534 with the prompt alone.
- An effect with no hold removes the guides 461 and 464 and the matte nodes 410 to 412.
- An effect with no guide at all removes the crop nodes 462 and 465.
- A recipe with an adapter adds node 420, a `LoraLoaderModelOnly` between the model and both guiders. No recipe has one.

The UI file holds a muted `MaskPreview` on the matte and a muted `PreviewImage` on the end frame, so you can turn them on.

## Use restrictions

The LTX-2.x Community License asks Rosesfield to pass its use restrictions to you. They include a statement that the output is machine generated and a ban on deepfakes made without consent. The licence is free for an entity under 10,000,000 USD of annual revenue and needs a paid agreement above that. Read it at [LICENSE-2_x](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x).

## Files

- [`effects-ltx-2-5.api.json`](effects-ltx-2-5.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`effects-ltx-2-5.json`](effects-ltx-2-5.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Written for Rosesfield from ComfyUI core nodes. Its two-stage render starts from Comfy's template `video_ltx2_5_i2v` and keeps its node ids, and its end-frame pass starts from the wiring of Comfy's FLUX.2 Klein edit template, both in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17. Rosesfield adds the end-frame and hold guides, the crop guides and the recipe's length, and removes the sound. Lightricks' own example workflows carry the LTX-2 Community License and were not used.

## Checked

Every node class this file holds is listed by Comfy Cloud's `object_info`, read on 2026-10-19, and each one comes from ComfyUI's `nodes` or `comfy_extras` modules. Every model file it loads is in Comfy Cloud's model folders, per the same reading. The runs from the Effects screen are the proof that it runs, and the effects lab records them. Some runs start black: their first 57 frames, or every frame, decode to black. The lab's runs with the first-stage lock at 0.7 cleared the cases it measured, and one run of `workflows/video-ltx-2-5-start-frame` with the same lock still started black, so the cause is not settled.
