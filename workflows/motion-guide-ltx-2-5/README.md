# Motion: move a photo along a depth guide on LTX 2.5

Renders the person in your photo moving along a depth guide video, on LTX 2.5 22B distilled bf16 with the LTX 2.3 union control IC-LoRA, in Lightricks' two stages. An optional people mask keeps the guide at full attention on the set and at 0.2 on the people, so the camera and the set follow the guide and the people move as the model moves them. An optional end key guides the last frame. The video carries LTX's own sound, levelled as Effects levels it, and the graph saves the video's last frame as an image.

| | |
|---|---|
| Workflow id | `motion-guide-ltx-2-5` |
| Run by | [`motion`](../../packages/catalog/src/motion/), as the model `ltx-2-5-guide` |
| Core model | LTX 2.5 22B distilled, bf16, with the LTX 2.3 union control IC-LoRA |
| Custom node packs | none, every node is a ComfyUI core node |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `photo` | 200 `LoadImage`, Photo, frame 0 | `image` | an uploaded image: frame 0 |
| `clip` | 199 `LoadVideo`, Guide video | `file` | an uploaded video: the depth guide |
| `mask` | 950 `LoadVideo`, People mask | `file` | an uploaded video: white on the people, black on the set, the guide's size and frame count |
| `endKey` | 1002 `LoadImage`, End key | `image` | an uploaded image: the last frame |
| `scene` | 900 `StringConcatenate`, Scene | `string_b` | a value |
| `seed` | 980 `RandomNoise`, Seed | `noise_seed` | a value |

The catalog sets the short side, node 702, from a run's `resolution`: 512 for 480p and 768 for 720p. It names node 68, the video, as the run's one result, so the last frame of node 1011 is held out of the library for the end key. It removes nodes 950 to 969 and the guide's `attention_mask` when a run has no mask, so the guide holds every pixel at full attention. It removes the end-key nodes 1001 to 1005 when a run has no end key, and the last-frame nodes 1010 and 1011 when it has one.

## Outputs

| Node | Key | Kind |
|---|---|---|
| 68 `SaveVideo` | `images` | video, MP4 with H.264 and AAC sound |
| 1011 `SaveImage` | `images` | image, PNG: the video's last frame, in a run with no end key |

## How it runs

It is the graph of [`motion-guide-ltx-2-3-ic-lora`](../motion-guide-ltx-2-3-ic-lora/README.md), moved to LTX 2.5 in two stages, with a people mask, an end key and sound.

1. **The guide.** Nodes 692 and 706 to 719 keep the first 10 seconds of the guide and repeat its last frame, and node 725 keeps the frames node 716 counts: the guide's own frames when they count 8 n + 1, else the next 8 n + 1. So a guide of 97 frames renders 97, and no frame is rendered to be thrown away.
2. **The people mask.** Nodes 950 to 956 and 967 read the mask as the guide is read, from its red channel, to the same frame count. Node 957 grows it by 6 px for every 240 px of its short side, which nodes 968 and 969 compute, so a mask read at 768 px grows 19 px as the recipe's 240 by 360 mask grew 6 px, and nodes 958 to 960 blur it with a Gaussian of sigma 4 px. Nodes 961 to 966 turn it into the guide's attention: `1 - 0.8 * mask`, so 1.0 on the set and 0.2 on the people. Node 115, `LTXVAddGuide`, takes it as its `attention_mask`.
3. **The size.** Nodes 990 and 991 set stage 1 to half the output size, each side a multiple of 64, so the half-size IC-LoRA guide halves evenly. A 2:3 photo at the short side 512 renders 256 by 384 in stage 1 and 512 by 768 out.
4. **Stage 1.** Node 198 locks your photo at frame 0. Node 115 adds the depth guide through the IC-LoRA at strength 1.0. Node 1001 adds the end key at the last frame at 0.9, preprocessed at 18 by node 1005. Node 704 samples Lightricks' 8 distilled sigmas with `euler_ancestral` at CFG 1.
5. **Stage 2.** Node 106 crops the guide frames. Node 993 doubles the latent with the LTX 2.5 latent upscaler. Node 994 locks the photo again at 1.0, node 1003 adds the end key again at 0.9, and node 999 refines with the sigmas 0.909375, 0.725, 0.421875 and 0.0. Node 1004 crops the guide frames before the decode.
6. **The video.** Node 105 decodes it, and node 724 keeps the guide's frame count from render frame 1 on, so your photo, frame 0, is not shown.
7. **The sound.** Node 358 decodes the stage-2 audio latent. Nodes 359 to 361 are the Effects loudness chain with the values of `effects-ltx-2-5`: node 359 sets -23 LUFS, and nodes 360 and 361 raise the sound by 4 dB, where `AudioAmplify` clips each sample to full scale, and lower it back, so no sample passes -4 dBFS.
8. **The last frame.** Nodes 1010 and 1011 save the last frame of the video as a PNG, the frame the end-key loop restores into the final's end key.

**The prompt.** Node 900 puts a fixed sentence before your words, which keeps the person from your photo the same. It names no control and no motion, because the guide carries the motion.

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `ltx-2.5-22b-distilled-transformer-bf16.safetensors` | LTX 2.5 22B distilled, bf16 | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.5/resolve/main/diffusion_models/ltx-2.5-22b-distilled-transformer-bf16.safetensors) |
| `ltx-2.5-video-vae-bf16.safetensors` | LTX 2.5 video VAE | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | `models/vae` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.5/resolve/main/vae/ltx-2.5-video-vae-bf16.safetensors) |
| `ltx-2.5-audio-vae-bf16.safetensors` | LTX 2.5 audio VAE | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | `models/vae` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.5/resolve/main/vae/ltx-2.5-audio-vae-bf16.safetensors) |
| `gemma4-12b-with-proj-ltx-2.5-bf16.safetensors` | Gemma 4 12B text encoder with the LTX 2.5 projections, bf16 | [the licence of the LTX 2.5 repository it sits in](https://huggingface.co/Lightricks/LTX-2.5) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.5/resolve/main/text_encoders/gemma4-12b-with-proj-ltx-2.5-bf16.safetensors) |
| `ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors` | LTX 2.5 latent upscaler, 2 times | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | `models/latent_upscale_models` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.5/resolve/main/latent_upscale_models/ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors) |
| `ltx-2.3-22b-ic-lora-union-control-ref0.5.safetensors` | LTX 2.3 union control IC-LoRA, reference at half size | [LTX-2 Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2) | `models/loras` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.3-22b-IC-LoRA-Union-Control/resolve/main/ltx-2.3-22b-ic-lora-union-control-ref0.5.safetensors) |

Lightricks' LTX 2.5 files are gated on Hugging Face, so their SHA256 digests are not in the UI file. Accept the LTX 2.5 licence on Hugging Face before you download them. The 2.3 union LoRA on the 2.5 transformer is how Lightricks' own LTX-2.5 IC-LoRA union control graph loads it.

## Files

- [`motion-guide-ltx-2-5.api.json`](motion-guide-ltx-2-5.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`motion-guide-ltx-2-5.json`](motion-guide-ltx-2-5.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script writes it from the API file with the node definitions of a Comfy Cloud `object_info` read.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

The graph of [`motion-guide-ltx-2-3-ic-lora`](../motion-guide-ltx-2-3-ic-lora/README.md), which follows Comfy's template `video_ltx2_3_ic_lora` at commit `59a3b48bf369c5a15f29a1308bae3e279fa15505` of [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT. The two stages follow the stage values of [`effects-ltx-2-5`](../effects-ltx-2-5/README.md) and of Lightricks' LTX-2.5 IC-LoRA union control graph, read for its structure and not copied.

## Checked

Every node class, input name, required input, link type and choice value of the API file was checked against Comfy Cloud's `GET /api/object_info`, read on 2026-10-29, and every file it loads is listed there under its loader.
