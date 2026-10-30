# Motion: swap the person in your clip for your reference on LTX 2.3

Regenerates only the person SAM 3.1 tracks in up to 5 seconds of your clip, as the subject of your reference image and your prompt, and keeps the camera, the motion and the rest of the frame. LTX 2.3 22B distilled with Alissonerdx's masked reference inpaint LoRA renders it in two passes. The video carries your clip's own sound when it has one.

| | |
|---|---|
| Workflow id | `motion-swap-ltx-2-3` |
| Run by | [`motion`](../../packages/catalog/src/motion/), as the model `ltx-2-3-swap` of the task `character-swap`, through `swapEngine` in `packages/catalog/src/motion/comfy/swap-ltx-2-3-binding.ts` |
| Core models | LTX 2.3 22B distilled, the masked reference inpaint LoRA, SAM 3.1 and BiRefNet |
| Custom node packs | two. [ComfyUI-KJNodes](https://github.com/kijai/ComfyUI-KJNodes) at commit `ab72eda7ffad6280422d71ab7d54d3fb87c0ba18`, GPL-3.0, registry id `comfyui-kjnodes`, gives `BlockifyMask`, `LTXVAddGuideMulti` and `VAELoaderKJ`. [ComfyUI-BFSNodes](https://github.com/alisson-anjos/ComfyUI-BFSNodes) at commit `1e76045b19a99882f1331c9d322a26fac60ae9b8`, GPL-3.0, registry id `comfyui-bfsnodes`, gives `ReservedRegionFrameComposer`. Comfy Cloud lists all four in its `object_info`. Every other node is a ComfyUI core node |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists them for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `clip` | 1 `LoadVideo` | `file` | an uploaded video. Motion binds its `clip` |
| `reference` | 2 `LoadImage` | `image` | one image of the new subject. Motion binds the first of its `photo` |
| `target` | 3 `CLIPTextEncode` | `text` | a short description of the one to replace, which SAM 3.1 tracks. The graph's own value is `the person` |
| `prompt` | 4 `CLIPTextEncode` | `text` | the scene with the new subject in it. Motion binds its `scene` |
| `seed` | 5 `RandomNoise` | `noise_seed` | the seed of both passes |

The result depends most on the prompt and on the size of the mask. Describe the whole scene with the new subject in it, its look, its clothes and what it does. A short prompt can make the model copy another person of the scene instead of the reference.

## Outputs

| Node | Key | Kind | What it holds |
|---|---|---|---|
| 121 `SaveVideo` | `images` | video | your clip with the person replaced, at 24 fps, with your clip's shape and its long side at 960 px, and its own sound when it has one |

## How it works

1. Node 10 keeps the first 5 seconds of your clip. Node 15 takes evenly spaced frames at 24 a second, or every frame of a clip slower than 24 fps, which then keeps its own rate. Nodes 17 to 23 repeat the last frame up to the 8 n + 1 frames LTX renders, and node 99 cuts the render back to your clip's length. A 2-second clip of 49 frames at 24 fps renders all 49.
2. The guide is one video: your frames, the one to replace painted magenta, 255 0 255, and your reference in a 256 px chroma green panel, 0 255 0, on the left. The LoRA was trained on that layout. `ReservedRegionFrameComposer` keeps the frame size and fits your frames beside the panel, so nodes 25 to 28 first stretch your frames to a render size whose part beside the panel holds them at a long side of at least 960 px, in multiples of 64. A vertical 1080 by 1920 clip renders at 832 by 1408, and its frames take 576 by 975 of it.
3. Node 30 tracks one object that the target names with SAM 3.1. Node 32 grows its mask by 10 px of the guide, and nodes 33 and 34 turn it into blocks, so the new subject is free of the old one's outline: 8 px in the half-size guide of pass 1, the size the LoRA's author trained on, and 32 px in the full-size guide of pass 2. Nodes 46 to 48 scale those sizes by how much the composer shrinks your frames.
4. Node 38 cuts the reference out with BiRefNet and node 42 places it on white, as the author's workflow does.
5. `LTXVAddGuideMulti` adds the guide at frame 0 at strength 1. Pass 1 renders at half size with the LoRA, 8 distilled steps and `euler_ancestral_cfg_pp` at CFG 1. `LTXVCropGuides` drops the guide frames, `LTXVLatentUpsampler` doubles the size, and pass 2 refines from sigma 0.85 with `euler_cfg_pp` and the full-size guide.
6. LTX returns the whole render as your clip, with no panel and no bands: on a 1080 by 1920 clip the render's 832 by 1408 frames hold your whole frame. Node 98 scales them to your clip's shape with its long side at 960 px, so the video keeps your framing. Node 120 joins it with your clip's sound at 24 fps. A clip with no sound makes a video with no sound.

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `ltx-2.3-22b-distilled_transformer_only_fp8_input_scaled_v3.safetensors` | LTX 2.3 22B distilled, fp8, by Lightricks | [LTX-2 Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Kijai/LTX2.3_comfy/resolve/main/diffusion_models/ltx-2.3-22b-distilled_transformer_only_fp8_input_scaled_v3.safetensors) |
| `ltx23_inpaint_masked_r2v_rank32_v1_3000steps.safetensors` | the masked reference inpaint LoRA for LTX 2.3, by Alissonerdx | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0), per its [model card](https://huggingface.co/Alissonerdx/LTX-LoRAs) | `models/loras` | [Hugging Face](https://huggingface.co/Alissonerdx/LTX-LoRAs/resolve/main/ltx23_inpaint_masked_r2v_rank32_v1_3000steps.safetensors) |
| `gemma_3_12B_it_fp8_scaled.safetensors` | Gemma 3 12B, the text encoder | [Gemma Terms of Use](https://ai.google.dev/gemma/terms) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/ltx-2/resolve/main/split_files/text_encoders/gemma_3_12B_it_fp8_scaled.safetensors) |
| `ltx-2.3_text_projection_bf16.safetensors` | the LTX 2.3 text projection | [LTX-2 Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Kijai/LTX2.3_comfy/resolve/main/text_encoders/ltx-2.3_text_projection_bf16.safetensors) |
| `LTX23_video_vae_bf16.safetensors` | the LTX 2.3 video VAE | [LTX-2 Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2) | `models/vae` | [Hugging Face](https://huggingface.co/Kijai/LTX2.3_comfy/resolve/main/vae/LTX23_video_vae_bf16.safetensors) |
| `LTX23_audio_vae_bf16.safetensors` | the LTX 2.3 audio VAE | [LTX-2 Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2) | `models/vae` | [Hugging Face](https://huggingface.co/Kijai/LTX2.3_comfy/resolve/main/vae/LTX23_audio_vae_bf16.safetensors) |
| `ltx-2.3-spatial-upscaler-x2-1.0.safetensors` | the LTX 2.3 latent upscaler | [LTX-2 Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2) | `models/latent_upscale_models` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.3/resolve/main/ltx-2.3-spatial-upscaler-x2-1.0.safetensors) |
| `sam3.1_multiplex_fp16.safetensors` | SAM 3.1, by Meta | the SAM License, [`sam-license.txt`](../sam-license.txt) | `models/checkpoints` | [Hugging Face](https://huggingface.co/Comfy-Org/sam3.1/resolve/main/checkpoints/sam3.1_multiplex_fp16.safetensors) |
| `birefnet.safetensors` | BiRefNet | [MIT](https://huggingface.co/ZhengPeng7/BiRefNet) | `models/background_removal` | [Hugging Face](https://huggingface.co/Comfy-Org/BiRefNet/resolve/main/background_removal/birefnet.safetensors) |

## Files

- [`motion-swap-ltx-2-3.api.json`](motion-swap-ltx-2-3.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`motion-swap-ltx-2-3.json`](motion-swap-ltx-2-3.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script writes it from the API file with the node definitions read from source: ComfyUI core, ComfyUI-KJNodes and ComfyUI-BFSNodes at the commits above.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

It adapts Alissonerdx's workflow `masked_ref_inpaint_v1` for the LoRA, read as data: its loaders and files, the magenta mask in blocks, the reference panel and its 14 values, `LTXVPreprocess` at 18, `LTXVAddGuideMulti` at frame 0 and strength 1, and the sigmas and samplers of both passes. Its UI helpers, the Get and Set nodes, the notes, the previews, the points editor, SAM 2 and the GPU cleaners, are left out, and each link is wired direct. Core nodes do the steps its packs did: `SAM3_VideoTrack` and `SAM3_TrackToMask` track the target, as [`motion-read-clip`](../motion-read-clip/README.md) does, `GrowMask` grows it, `EmptyImage` and `ImageCompositeMasked` paint it magenta, `RemoveBackground` with `ImageCompositeMasked` places the reference on white, and `VideoFrameSample` reads the clip at 24 fps. Each value of `ReservedRegionFrameComposer` maps to its input by the order of `INPUT_TYPES` in ComfyUI-BFSNodes' `nodes.py`, and each value of `BlockifyMask`, `LTXVAddGuideMulti` and `VAELoaderKJ` by ComfyUI-KJNodes' `nodes/mask_nodes.py`, `nodes/ltxv_nodes.py` and `nodes/nodes.py`.

## Checked

Comfy Cloud's `GET /api/object_info`, read on 2026-10-29, lists every node class and every input this graph names, and its model folders and `packages/catalog/src/comfy/cloud-weights.json` hold every file, per `bun run cloud:check`. No run has proven it yet.
