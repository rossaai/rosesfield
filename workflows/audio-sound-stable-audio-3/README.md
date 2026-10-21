# Sound: a sound from a description with Stable Audio 3 Medium

Makes stereo sound from a description, such as a sound effect, an ambience or a short piece of music, as long as the length you set. Built from Comfy's template audio_stable_audio_3_medium, without its Qwen rewrite of the description.

| | |
|---|---|
| Workflow id | `audio-sound-stable-audio-3` |
| Run by | [`audio`](../../packages/catalog/src/audio/), Sound effects |
| Core model | Stable Audio 3 Medium |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | Not measured. The model files it loads add up to 10.4 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `description` | 6 `CLIPTextEncode`, Description | `text` | a value |
| `length` | 11 `EmptyLatentAudio`, Length | `seconds` | a value |
| `seed` | 3 `KSampler`, Sampler | `seed` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 57 `SaveAudioMP3` | `audio` | audio |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `stable_audio_3_medium.safetensors` | Stable Audio 3 Medium, by Stability AI | [Stability AI Community License](https://stability.ai/community-license-agreement) | `models/checkpoints` | [Hugging Face](https://huggingface.co/Comfy-Org/stable-audio-3/resolve/main/checkpoints/stable_audio_3_medium.safetensors) |
| `t5gemma_b_b_ul2.safetensors` | T5Gemma text encoder of Stable Audio 3 | [Stability AI Community License](https://stability.ai/community-license-agreement) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/stable-audio-3/resolve/main/text_encoders/t5gemma_b_b_ul2.safetensors) |

The Community License grants use below 1,000,000 USD of annual revenue. The licence file on Hugging Face sits behind a login and was not read. The public agreement at the link was read.

## How it differs from the template

- The template rewrites your description with Qwen 3.5 2B before Stable Audio reads it, through a subgraph of switch, math and text nodes. This graph sends your description to Stable Audio as you wrote it, so it loads no Qwen file and stays flat.
- The template saves with `SaveAudioAdvanced`. This graph saves with `SaveAudioMP3` at V0, the same MP3 the template writes, like Rosesfield's other audio graphs.
- The sampler keeps the template's values: 8 steps, CFG 1, `lcm`, `simple`.

Stability's effects checkpoint, `stable_audio_3_small_sfx.safetensors`, is in the same Hugging Face repository and has no Comfy Cloud template, so this graph loads the Medium checkpoint.

## Files

- [`audio-sound-stable-audio-3.api.json`](audio-sound-stable-audio-3.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`audio-sound-stable-audio-3.json`](audio-sound-stable-audio-3.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script wrote it from the API file with the node definitions of ComfyUI v0.41.0. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `audio_stable_audio_3_medium` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates) at `59a3b48bf369c5a15f29a1308bae3e279fa15505`, MIT, read on 2026-10-20, with the subgraph opened.

## Not checked

No run of this workflow on a live engine exists. Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
