# Effects: change your clip with an LTX 2.3 IC-LoRA

Changes your own clip with one LTX 2.3 IC-LoRA that an effect picks, such as day to night, clean plate or water, at your clip's shape, length and frame rate, with your clip's sound. The effect sets the adapter, its strength and both prompts. Built from Rosesfield's reframe graph, [`video-edit-reframe-ltx-2-3`](../video-edit-reframe-ltx-2-3/README.md), which follows Comfy's template template_ltx2_3_lora_video_outpainting.

| | |
|---|---|
| Workflow id | `effects-clip-ltx-2-3-ic-lora` |
| Run by | no app yet. An effect on your clip binds it once one comes from a measured reference |
| Core model | LTX 2.3 22B dev, fp8, with the distilled LoRA and the effect's IC-LoRA |
| Custom node packs | [ComfyUI-LTXVideo](https://github.com/Lightricks/ComfyUI-LTXVideo) at commit `82bd963cdeb66d023bed8c99324a307020907ef8`, LTX-2 Community License. It gives `LTXAddVideoICLoRAGuide`. Comfy Cloud installs it. |
| GPU memory | Not measured. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `clip` | 1 `LoadVideo` | `file` | an uploaded video, your clip |
| `shortSide` | 702 `PrimitiveInt` | `value` | a value: 448 for 480p, or 704 for 720p |
| `adapter` | 5146 `LoraLoaderModelOnly` | `lora_name` | a value: the effect's IC-LoRA file |
| `strength` | 5146 `LoraLoaderModelOnly` | `strength_model` | a value: the effect's adapter strength |
| `prompt` | 5138 `CLIPTextEncode` | `text` | a value: the effect's prompt |
| `negative` | 5131 `CLIPTextEncode` | `text` | a value: the effect's negative prompt |
| `seed` | 5117 `RandomNoise` | `noise_seed` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 44 `SaveVideo` | `images` | video |

## How it runs

It is the reframe graph with three changes.

- **Your clip keeps its shape.** Nodes 12 and 13 compute the frame from your clip's size and `shortSide`, each side a multiple of 32, so the clip fills the frame and nothing is padded.
- **The effect picks the adapter.** Node 5146 loads the effect's IC-LoRA at the effect's strength, in place of the outpainting IC-LoRA.
- **The effect writes both prompts.** Node 5138 takes the effect's prompt and node 5131 its negative prompt.

Node 5142 gives your clip to LTX 2.3 as the IC-LoRA guide at full strength. One sampling pass of 8 steps runs on the distilled LoRA at 0.5 and the effect's IC-LoRA, with the sigmas of the template. LTX keeps 8 times n plus 1 frames, so the output can be up to 7 frames shorter than your clip. Node 43 writes the frames at your clip's frame rate, with your clip's sound.

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names. Comfy Cloud's `GET /api/object_info`, read on 2026-10-29, lists each file below under the loader that loads it.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `ltx-2.3-22b-dev-fp8.safetensors` | LTX 2.3 22B dev, fp8, with its video VAE and audio VAE | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | `models/checkpoints` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.3-fp8/resolve/main/ltx-2.3-22b-dev-fp8.safetensors) |
| `ltx-2.3-22b-distilled-lora-384.safetensors` | LTX 2.3 distilled LoRA | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | `models/loras` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.3/resolve/main/ltx-2.3-22b-distilled-lora-384.safetensors) |
| `ltx-2.3-22b-ic-lora-clean-plate-1.0.safetensors` | LTX 2.3 clean plate IC-LoRA | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | `models/loras` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.3-22b-IC-LoRA-Clean-Plate) |
| `ltx-2.3-22b-ic-lora-day-to-night-0.9.safetensors` | LTX 2.3 day to night IC-LoRA | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | `models/loras` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.3-22b-IC-LoRA-Day-To-Night) |
| `ltx-2.3-22b-ic-lora-water-simulation-0.9.safetensors` | LTX 2.3 water simulation IC-LoRA | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | `models/loras` | [Hugging Face](https://huggingface.co/Lightricks/LTX-2.3-22b-IC-LoRA-Water-Simulation) |
| `gemma_3_12B_it.safetensors` | Gemma 3 12B text encoder | [Gemma Terms of Use](https://ai.google.dev/gemma/terms) | `models/text_encoders` | [Hugging Face](https://huggingface.co/Comfy-Org/ltx-2/resolve/main/split_files/text_encoders/gemma_3_12B_it.safetensors) |

The three IC-LoRA cards on Hugging Face are gated, so no digest was read and the UI file carries none. The UI file lists the day to night file on its loader, the value the API file holds.

## Files

- [`effects-clip-ltx-2-3-ic-lora.api.json`](effects-clip-ltx-2-3-ic-lora.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`effects-clip-ltx-2-3-ic-lora.json`](effects-clip-ltx-2-3-ic-lora.json) is the same graph in ComfyUI's UI format. A script wrote it from the reframe graph's UI file. No ComfyUI loaded or saved it yet.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Not checked

No run of this workflow on a live engine exists. Whether each adapter holds on a phone clip is unmeasured. The instrument is one 480p run per effect, with a maintainer's yes.
