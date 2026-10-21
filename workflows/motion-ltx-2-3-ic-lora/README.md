# Motion: move a photo with the motion of a clip on LTX 2.3

Renders the person in your photo making the movements of your clip, on LTX 2.3 22B distilled with its union control IC-LoRA in 8 steps. SDPose draws the pose of one person in each frame of the clip as the guide, and your photo is the first frame, so the scene comes from your photo. The video keeps the clip's frame count and frame rate, with the clip's sound kept or left out. Built from Comfy's template video_ltx2_3_ic_lora.

| | |
|---|---|
| Workflow id | `motion-ltx-2-3-ic-lora` |
| Run by | [`motion`](../../packages/catalog/src/motion/), in Move a photo and in Swap a character |
| Core model | LTX 2.3 22B distilled, with the LTX 2.3 union control IC-LoRA |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 41.7 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `photo` | 200 `LoadImage`, Photo | `image` | an uploaded image |
| `clip` | 199 `LoadVideo`, Clip | `file` | an uploaded video |
| `scene` | 900 `StringConcatenate`, Motion and scene | `string_b` | a value |
| `shortSide` | 702 `PrimitiveInt`, Short side | `value` | a value: 480, or 704 for 720p |
| `seed` | 704 `KSampler` | `seed` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 68 `SaveVideo` | `images` | video, MP4 with H.264 |

## How it runs

- **The clip.** Node 692 keeps the first 10 seconds of the clip, and node 706 splits it into its frames, its sound and its frame rate.
- **The pose guide.** Node 709 finds one person in each frame with RT-DETR, node 711 reads their body, hands, face and feet with SDPose, and node 712 draws that pose. The template guides with a depth map of the clip, and a depth map carries the clip's room and objects. A pose carries only the person's movement, so the scene comes from your photo. The union control IC-LoRA takes pose, depth and edges, per its [model card](https://huggingface.co/Lightricks/LTX-2.3-22b-IC-LoRA-Union-Control).
- **The length.** LTX renders 8 n + 1 frames. A clip of n frames gets the last pose repeated until the guide holds the next count of 8 n + 1 frames, nodes 714 to 719. Node 724 keeps the first n frames of the render, and node 122 writes them at the clip's frame rate, so the video lasts as long as the clip.
- **The size.** Nodes 721 to 723 set the short side of the video to the bound value and keep the photo's ratio, each side a multiple of 32.
- **The first frame.** Node 198 puts your photo in the first frame at full strength. Node 115 adds the pose guide through the IC-LoRA's parameters, node 196, and node 106 removes the guide frames after sampling.
- **The sound.** LTX 2.3 samples video and audio together, so the graph keeps its audio latent, nodes 101 and 119, and never decodes it. With Keep the clip's sound on, node 122 writes the clip's own sound, cut to the video's length. With it off, the catalog removes that link, and the video has no audio track.
- **The prompt.** Node 900 puts a fixed sentence about following the pose before your words about the scene. The prompt enhancer of the template is left out, so the model reads your words.

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names. Each digest is the SHA256 Hugging Face lists for the file, read on 2026-10-20.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `ltx-2.3-22b-distilled-fp8.safetensors` | LTX 2.3 22B distilled, fp8, with its video and audio VAEs | [LTX-2 Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2), card tag `ltx-2-community-license-agreement` on Lightricks/LTX-2.3-fp8 at `1d756cd27fa11c0896c4dfee093cd1bf36c7f7a1` | `models/checkpoints` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.3-fp8/resolve/main/ltx-2.3-22b-distilled-fp8.safetensors) |
| `ltx-2.3-22b-ic-lora-union-control-ref0.5.safetensors` | LTX 2.3 union control IC-LoRA, reference at half size | [LTX-2 Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2), card tag `ltx-2-community-license` on Lightricks/LTX-2.3-22b-IC-LoRA-Union-Control at `b4d1c4d8c9e544e9bbbd6811bb4363708b6093ff` | `models/loras` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.3-22b-IC-LoRA-Union-Control/resolve/main/ltx-2.3-22b-ic-lora-union-control-ref0.5.safetensors) |
| `gemma_3_12B_it_fp4_mixed.safetensors` | Gemma 3 12B text encoder, fp4 | [Gemma Terms of Use](https://ai.google.dev/gemma/terms) of its base model google/gemma-3-12b-it | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/ltx-2/resolve/main/split_files/text_encoders/gemma_3_12B_it_fp4_mixed.safetensors) |
| `sdpose_wholebody_fp16.safetensors` | SDPose whole body | card tag `mit` on Comfy-Org/SDPose at `acb43fbe8142b54d9ebd52b720b81dd4e14c8d81`, base model teemosliang/SDPose-Wholebody | `models/checkpoints` | [Hugging Face](https://huggingface.co/Comfy-Org/SDPose/resolve/main/checkpoints/sdpose_wholebody_fp16.safetensors) |
| `rt_detr_v4-x-hgnet_fp16.safetensors` | RT-DETR v4 X detector | the card tag `mit` of Comfy-Org/SDPose, the repository it sits in. The licence of the upstream RT-DETR v4 weights was not read | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/SDPose/resolve/main/diffusion_models/rt_detr_v4-x-hgnet_fp16.safetensors) |

## Files

- [`motion-ltx-2-3-ic-lora.api.json`](motion-ltx-2-3-ic-lora.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`motion-ltx-2-3-ic-lora.json`](motion-ltx-2-3-ic-lora.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link and its digest. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its loaders, its IC-LoRA guide, its sampler at 8 steps with `euler_ancestral` and `linear_quadratic`, and its crop and decode follow Comfy's template `video_ltx2_3_ic_lora` at commit `59a3b48bf369c5a15f29a1308bae3e279fa15505` of [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, with its subgraphs opened. The node ids are the inner ids of the template where the node is the template's. Its pose guide, nodes 707 to 712, follows the SDPose subgraph of `video_minimax_h3_fun_controlnet_union` at the same commit, with one person in place of two.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source in `comfy_extras/nodes_lt.py`, `nodes_lt_audio.py`, `nodes_sdpose.py`, `nodes_rtdetr.py`, `nodes_math.py`, `nodes_video.py`, `nodes_images.py`, `nodes_post_processing.py`, `nodes_string.py` and `nodes.py`.
