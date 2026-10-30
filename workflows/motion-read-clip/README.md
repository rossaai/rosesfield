# Motion: read a clip into its depth, its targets' mask and its first frame

Reads up to 10 seconds of a clip at a short side of at most 768 px. Depth Anything 3 Mono-Large makes its depth video, SAM 3.1 tracks one object for each of up to 3 things named by text into one mask video, and the first frame is saved. The three guide the LTX 2.5 render of Motion's Change a clip.

| | |
|---|---|
| Workflow id | `motion-read-clip` |
| Run by | [`motion`](../../packages/catalog/src/motion/), through `readClipBinding` in `packages/catalog/src/motion/comfy/read-clip-binding.ts` |
| Core models | Depth Anything 3 Mono-Large and SAM 3.1 |
| Custom node packs | one, for the depth only. [ComfyUI-DepthAnythingV3](https://github.com/PozzettiAndrea/ComfyUI-DepthAnythingV3) at commit `20ef6c8ccf8d57a0ad6f6fa7031739eb8489f2a4`, MIT, registry id `ComfyUI-DepthAnythingV3`, gives `DownloadAndLoadDepthAnythingV3Model` and `DepthAnything_V3`. Comfy Cloud lists both in its `object_info`. Every other node is a ComfyUI core node |
| GPU memory | The model files it loads add up to 3.1 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `clip` | 1 `LoadVideo` | `file` | an uploaded video |
| `targets` | 21 `CLIPTextEncode` | `text` | up to 3 short descriptions, separated by commas |
| `objects` | 22 `SAM3_VideoTrack` | `max_objects` | the most objects SAM 3.1 tracks, 1, 2 or 3. The catalog sets it to the number of targets. The graph's own value is 3 |

SAM 3.1's text encoder splits the text at each comma and finds at most one thing for each part, so `the man in the grey coat, the bottle in his hand` tracks two things. A part that ends in `:` and a number finds that many, so the catalog removes commas, colons and parentheses from each description before it joins them.

## Outputs

| Node | Key | Kind | What it holds |
|---|---|---|---|
| 13 `SaveVideo` | `images` | video | the depth of every frame, near is white and far is black, at the clip's frame rate |
| 28 `SaveVideo` | `images` | video | the matte of the targets, white on them and black elsewhere, with hard edges, at the clip's frame rate |
| 31 `SaveImage` | `images` | image | the clip's first frame, at the size of the depth and the mask |

Motion runs the read held and its binding names no result node, so all three are held out of the library, History and Explore, and the run lists each under the node that saved it.

The three outputs share one size: the clip's frames scaled so the short side is at most 768 px, then to even sides. 768 is the short side of the 720p final, so the 480p draft and the final read the same files.

## How it reads the clip

1. Node 2 keeps the first 10 seconds. Nodes 4 to 7 scale every frame so its short side is at most 768 px, with even sides.
2. Node 11 reads each frame alone with Depth Anything 3 Mono-Large and its `V2-Style` normalization, which turns depth into disparity, so near is white, as the depth guides of `motion-guide-ltx-2-3-ic-lora` are. Each frame is normalized alone, so the depth can change in brightness from frame to frame. Whether that moves the render's camera is the first open question of the Motion outcome.
3. Node 22 tracks every target the text names through the frames with SAM 3.1, at a detection threshold of 0.5, detecting on every frame. It tracks at most one object per target: the catalog sets `max_objects` to the number of targets the plan names, so a person SAM 3.1 detects beside a target on a later frame stays out of the mask and keeps their own pixels in the render. Node 23 joins every tracked object into one mask, and node 25 makes it a video. The mask stays a hard matte, because the guided render grows it, feathers it and turns it into the guide's attention, 1.0 on the set and 0.2 on the targets, as it does for an effect's people matte.
4. A mask with no target is all black. The Comfy engine drops a video whose five stills are all black, so a run that finds none of the targets returns no mask video, and the hand-off refuses it.

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `da3mono_large.safetensors` | Depth Anything 3 Mono-Large, by ByteDance Seed | [Apache 2.0](https://huggingface.co/depth-anything/DA3MONO-LARGE) | `models/depthanything3` | [Hugging Face](https://huggingface.co/depth-anything/DA3MONO-LARGE/resolve/main/model.safetensors), saved under the file name in the first column |
| `sam3.1_multiplex_fp16.safetensors` | SAM 3.1, by Meta | the SAM License, [`sam-license.txt`](../sam-license.txt) | `models/checkpoints` | [Hugging Face](https://huggingface.co/Comfy-Org/sam3.1/resolve/main/checkpoints/sam3.1_multiplex_fp16.safetensors) |

## Files

- [`motion-read-clip.api.json`](motion-read-clip.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`motion-read-clip.json`](motion-read-clip.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script writes it from the API file with the node definitions Comfy Cloud's `object_info` returned on 2026-10-29.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its tracking follows the core SAM 3 nodes as Comfy's template `video_wan21_scail2_character_replacement` wires them: `CheckpointLoaderSimple` loads SAM 3.1, its CLIP output feeds `CLIPTextEncode`, and `SAM3_VideoTrack` takes the frames, the model and the text. The comma split was read from `comfy/text_encoders/sam3_clip.py` and `comfy_extras/nodes_sam3.py` of ComfyUI's source. The depth nodes and their inputs were read from ComfyUI-DepthAnythingV3 at the pinned commit, `nodes/nodes_inference.py`, `nodes/load_model.py` and `nodes/normalization.py`.

## Checked

Comfy Cloud's `GET /api/object_info`, read on 2026-10-29 with 3,857 node classes, and its model folders list every node and every file this graph names: `DownloadAndLoadDepthAnythingV3Model` and `DepthAnything_V3` from `custom_nodes.ComfyUI-DepthAnythingV3`, `SAM3_VideoTrack` and `SAM3_TrackToMask` from `comfy_extras.nodes_sam3`, every other class from ComfyUI core, `da3mono_large.safetensors` in the depth loader's list and in the `depthanything3` folder, and `sam3.1_multiplex_fp16.safetensors` in `CheckpointLoaderSimple`'s list. Each node's class, each input name, each required input, each link's type and each fixed choice match those definitions.
