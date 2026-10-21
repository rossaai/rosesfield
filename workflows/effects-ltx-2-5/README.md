# Effects: one photo to a short effect video on LTX 2.5

Fits your photo to the chosen shape and makes the effect's last frame with Qwen Image Edit 2511, then renders the video between the two on LTX 2.5, with its sound, at the pixel area of the shape. LTX 2.5 is the only video model. This file holds every part a recipe can use, including the subject held through its matte. Each recipe in the catalog removes the parts it does not use.

| | |
|---|---|
| Workflow id | `effects-ltx-2-5` |
| Run by | [`effects`](../../packages/catalog/src/effects/) |
| Core model | LTX 2.5 22B distilled |
| Image model | Qwen Image Edit 2511, for the fit and the last frame |
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
| `fitWidth` | 614 `EmptySD3LatentImage`, Fit size | `width` | a value |
| `fitHeight` | 614 `EmptySD3LatentImage`, Fit size | `height` | a value |
| `fitSeed` | 615 `KSampler`, Fit | `seed` | a value |
| `endFrameSeed` | 626 `KSampler`, End frame | `seed` | a value |
| `deliveryWidth` | 380 `ImageScale`, Delivery size | `width` | a value |
| `deliveryHeight` | 380 `ImageScale`, Delivery size | `height` | a value |

The recipe sets the rest: the prompt on node 501, the sound line on node 503, the fit prompt on node 610, the length on nodes 356 and 366, the end-frame prompt on node 620 and the strengths on nodes 460, 461, 463 and 464.

## Outputs

| Node | Key | Kind |
|---|---|---|
| 75 `SaveVideo` | `images` | video, H.264 in MP4 |

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
| `qwen_image_edit_2511_bf16.safetensors` | Qwen Image Edit 2511, bf16, for the fit and the last frame | [Apache-2.0](https://huggingface.co/Qwen/Qwen-Image-Edit-2511) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image-Edit_ComfyUI/resolve/main/split_files/diffusion_models/qwen_image_edit_2511_bf16.safetensors) |
| `qwen_2.5_vl_7b_fp8_scaled.safetensors` | Qwen2.5-VL 7B text encoder, fp8 | [Apache-2.0](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors) |
| `qwen_image_vae.safetensors` | Qwen Image VAE | [Apache-2.0](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors) |

Lightricks' LTX 2.5 files are gated on Hugging Face, so their SHA256 digests are not in the UI file. Accept the LTX 2.5 licence on Hugging Face before you download them.

## The effects

Each effect is a recipe kept as data in [`packages/catalog/src/effects/recipes/`](../../packages/catalog/src/effects/recipes/). A recipe holds its prompt, its end-frame prompt and strength, its hold strength, its adapter, which is always none, and its fixed length of 5 to 15 seconds. Its design holds the unit and the family of the reference reading it is designed from, the fit prompt, the set piece, the cut windows, the last frame, the sound bed with its loudness band and true peak, and the encode.

A recipe passes only with the proof of one run: a gate run of the look's criteria list that held its reference outputs and refused one planted output, a judge that wrote none of its inputs and held the run against every criterion that applies, a reading of the file inside the recipe's length, pixel area, cut windows, loudness band and last frame, and the row of that run in the run ledger, [`runs.json`](../../packages/catalog/src/effects/runs.json), with the same effect, graph, seed, resolution and shape and the verdict kept. Every run that made a kept or a refused output is a row of that ledger with its effect, the hash of its graph, the hash of its photo, its seed, resolution and shape, the balance before and after it, and the judge's verdict with the criteria it failed. The catalog refuses a row that starts or ends under 2,000 credits, and a passed recipe that lacks any of these, and Effects offers only the passed recipes. While none has passed, Effects takes no run.

| End-frame source | What the graph does |
|---|---|
| `none` | no end frame. The video runs on the prompt and the frame 0 lock |
| `edit` | Qwen Image Edit 2511 edits the fitted photo into the effect's last frame |

## What every run does

1. It fits your photo to the chosen shape with Qwen Image Edit 2511 in 20 steps, nodes 600 to 616, at about one megapixel. The fit prompt asks for new matching content at the added edges, with no bars.
2. It makes the effect's last frame from the fitted photo with the same model, nodes 620 to 627, at the fitted size, when the recipe has one.
3. It locks the fitted photo at frame 0 with `LTXVImgToVideoInplace`: at strength 0.7 in the first stage, node 357, and at 1.0 in the second, node 349.
4. It makes a matte of the subject with the core BiRefNet nodes `LoadBackgroundRemovalModel` and `RemoveBackground`, nodes 410 to 412, when the recipe holds the subject.
5. It renders the shot in two stages. The last frame is an `LTXVAddGuide` guide at the last frame, nodes 460 and 463. The photo is a second guide at the last frame with the subject matte as its `attention_mask`, nodes 461 and 464, so the subject holds while the scene changes. `LTXVCropGuides` removes the guide frames after each stage, nodes 462 and 465.
6. It decodes the sound with node 358 when the recipe has a sound bed, and removes it when the look is silent.
7. It scales the frames to the pixel area of the chosen resolution in the chosen shape, centre-cropped, node 380, such as 1280 by 720 at 16:9 and 832 by 1110 at 3:4 for 720p, and saves H.264 in MP4 at 24 frames a second, nodes 370 and 75.

## How a recipe changes this file

The catalog's [`effect-graph.ts`](../../packages/catalog/src/effects/comfy/effect-graph.ts) derives each recipe's graph from this file:

- It writes the recipe's prompt on node 501, its sound line on node 503, its fit prompt on node 610 and its length on nodes 356 and 366.
- An effect with no end frame removes nodes 620 to 627 and the guides 460 and 463, and links the next node to what the guide read.
- An effect with no hold removes the guides 461 and 464 and the matte nodes 410 to 412.
- An effect with no guide at all removes the crop nodes 462 and 465.
- A silent effect removes the audio decode, node 358.
- A recipe with an adapter adds node 420, a `LoraLoaderModelOnly` between the model and both guiders. No recipe has one.

The UI file holds a muted `MaskPreview` on the matte and a muted `PreviewImage` on the end frame, so you can turn them on.

## Use restrictions

The LTX-2.x Community License asks Rosesfield to pass its use restrictions to you. They include a statement that the output is machine generated and a ban on deepfakes made without consent. The licence is free for an entity under 10,000,000 USD of annual revenue and needs a paid agreement above that. Read it at [LICENSE-2_x](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x).

## Files

- [`effects-ltx-2-5.api.json`](effects-ltx-2-5.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`effects-ltx-2-5.json`](effects-ltx-2-5.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Written for Rosesfield from ComfyUI core nodes. Its two-stage render starts from Comfy's template `video_ltx2_5_i2v` and keeps its node ids, and its fit and end-frame passes start from the wiring of Comfy's template `image_qwen_image_edit_2511`, both in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT. Rosesfield adds the fit, the end-frame and hold guides, the crop guides, the recipe's length and sound, and the scale to the delivery size. Lightricks' own example workflows carry the LTX-2 Community License and were not used.

## Checked

Every node class this file holds comes from ComfyUI's `nodes` or `comfy_extras` modules. The LTX 2.5 and BiRefNet nodes and files were listed by Comfy Cloud's `object_info` and model folders on 2026-10-19, and the Qwen Image Edit 2511 nodes and files are the ones the workflow `headshots-qwen-image-edit-2511` runs. Node 75 sets no constant-quality value of its own, so the file is the core `SaveVideo` node's H.264 encode. The runs from the Effects screen are the proof that it runs, and the effects lab records them. Some runs start black: their first 57 frames, or every frame, decode to black. The lab's runs with the first-stage lock at 0.7 cleared the cases it measured, and one run of `workflows/video-ltx-2-5-start-frame` with the same lock still started black, so the cause is not settled.
