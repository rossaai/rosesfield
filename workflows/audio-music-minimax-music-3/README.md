# Music: a song from a description with MiniMax-Music3

Makes a song from a description and optional lyrics, up to the length you set. The model can end the song before that length. Built from Comfy's template audio_minimax_music_3.

| | |
|---|---|
| Workflow id | `audio-music-minimax-music-3` |
| Run by | [`audio`](../../packages/catalog/src/audio/), Music |
| Core model | MiniMax-Music3 |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | The model files it loads add up to 14.3 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `description` | 13 `MiniMaxMusic3TextEncode`, Description and lyrics | `caption` | a value |
| `lyrics` | 13 `MiniMaxMusic3TextEncode`, Description and lyrics | `lyrics` | a value |
| `length` | 13 `MiniMaxMusic3TextEncode`, Description and lyrics | `max_duration` | a value |
| `seed` | 13 `MiniMaxMusic3TextEncode`, Description and lyrics | `seed` | a value |
| `samplerSeed` | 9 `KSampler`, Sampler | `seed` | a value |

The text encoder writes the song's length in seconds, and the empty latent, node 15, takes that length through a link.

## Outputs

| Node | Key | Kind |
|---|---|---|
| 35 `SaveAudioMP3` | `audio` | audio |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `minimax_music3_dit_fp16.safetensors` | MiniMax-Music3, by MiniMax | [MiniMax-Music3 Community License](https://huggingface.co/MiniMaxAI/MiniMax-Music3/blob/fbdf52fbaaca799592917417eb05f1899f1255ec/LICENSE) | `models/diffusion_models` | [Hugging Face](https://huggingface.co/Comfy-Org/MiniMax-Music-3/resolve/main/diffusion_models/minimax_music3_dit_fp16.safetensors) |
| `minimax_music3_text_encoder_pruned_int8_convrot.safetensors` | MiniMax-Music3 text encoder | [MiniMax-Music3 Community License](https://huggingface.co/MiniMaxAI/MiniMax-Music3/blob/fbdf52fbaaca799592917417eb05f1899f1255ec/LICENSE) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/MiniMax-Music-3/resolve/main/text_encoders/minimax_music3_text_encoder_pruned_int8_convrot.safetensors) |
| `minimax_music3_dav.safetensors` | MiniMax-Music3 audio VAE | [MiniMax-Music3 Community License](https://huggingface.co/MiniMaxAI/MiniMax-Music3/blob/fbdf52fbaaca799592917417eb05f1899f1255ec/LICENSE) | `models/vae` | [Hugging Face](https://huggingface.co/Comfy-Org/MiniMax-Music-3/resolve/main/vae/minimax_music3_dav.safetensors) |

The licence asks a commercial product to show the name MiniMax-Music3 on its interface, and to ask MiniMax in writing above 20,000,000 USD of yearly revenue.

## How it differs from the template

- The template picks its seed with a `SeedNode` and feeds it to the text encoder and the sampler. This graph takes the run's seed on both nodes, so one run sets one seed.
- The template switches between `VAEDecodeAudio` and `VAEDecodeAudioTiled`, and its switch is off. This graph keeps `VAEDecodeAudio`, the node the switch picks.
- The template saves with `SaveAudioAdvanced`. This graph saves with `SaveAudioMP3` at V0, the same MP3 the template writes.
- The sampler and the text encoder keep the template's values: 30 steps, CFG 1.7, `euler`, `simple`, top k 50.

## Files

- [`audio-music-minimax-music-3.api.json`](audio-music-minimax-music-3.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`audio-music-minimax-music-3.json`](audio-music-minimax-music-3.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script writes it from the API file with the node definitions of ComfyUI v0.41.0.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `audio_minimax_music_3` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates) at `59a3b48bf369c5a15f29a1308bae3e279fa15505`, MIT, read on 2026-10-20, with the subgraph opened.

## Checked

Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
