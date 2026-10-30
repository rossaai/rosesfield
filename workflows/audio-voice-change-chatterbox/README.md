# Voice change: your words in another voice with Chatterbox

Says the words of your recording in the voice of a second recording. It reads the first 30 seconds of your recording. Built from Comfy's template audio-chatterbox_vc.

| | |
|---|---|
| Workflow id | `audio-voice-change-chatterbox` |
| Run by | [`audio`](../../packages/catalog/src/audio/), Voice change |
| Core model | Chatterbox voice conversion |
| Custom node packs | [ComfyUI_Fill-ChatterBox](https://github.com/filliptm/ComfyUI_Fill-ChatterBox) at commit `f7d7a16187430abcaf91a3039b9c83aa9960816a`, MIT, per its README |
| GPU memory | The node pack's README recommends an NVIDIA GPU with 8 GB of VRAM or more. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `source` | 3 `LoadAudio`, Your recording | `audio` | an uploaded audio |
| `target` | 2 `LoadAudio`, Target voice | `audio` | an uploaded audio |
| `seed` | 1 `FL_ChatterboxVC`, Voice change | `seed` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 4 `SaveAudioMP3` | `audio` | audio |

## Models

Rosesfield ships no weights. The voice node has no model loader, so ComfyUI shows no download button. The node pack downloads both files into `models/chatterbox/chatterbox_vc/` on its first run.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `s3gen.pt` | Chatterbox, by Resemble AI | [MIT](https://huggingface.co/ResembleAI/chatterbox) | `models/chatterbox/chatterbox_vc` | [Hugging Face](https://huggingface.co/ResembleAI/chatterbox/resolve/5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18/s3gen.pt) |
| `conds.pt` | Chatterbox, by Resemble AI | [MIT](https://huggingface.co/ResembleAI/chatterbox) | `models/chatterbox/chatterbox_vc` | [Hugging Face](https://huggingface.co/ResembleAI/chatterbox/resolve/5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18/conds.pt) |

## How it differs from the template

- The template cuts your recording to its first 27 seconds with `AudioCrop`. This graph cuts it to its first 30 seconds with the core node `TrimAudioDuration`, so a long recording cannot hold the GPU longer.
- The voice node keeps the template's values: it runs on the GPU and unloads its model after the run.

With `resemble-perth` installed, every output carries Resemble's hidden watermark.

## Files

- [`audio-voice-change-chatterbox.api.json`](audio-voice-change-chatterbox.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`audio-voice-change-chatterbox.json`](audio-voice-change-chatterbox.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. A script writes it from the API file with the node definitions of ComfyUI v0.41.0 and of the pinned node pack.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `audio-chatterbox_vc` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates) at `59a3b48bf369c5a15f29a1308bae3e279fa15505`, MIT, read on 2026-10-20.

## Checked

Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0 and the pinned node pack, read from source.
