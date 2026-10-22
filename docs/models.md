# Models

> How each app's model list is read from Comfy, and the licence of each graph Rosesfield ships in `workflows/`. Rosesfield ships no weights. A model's licence decides what you may do with what it makes, so read it before you use an output in your work.

## The catalog is Comfy's

An app declares the task it runs, such as text to image or image to video. Its model list is every model Comfy publishes for that task, read live, with Rosesfield's own graphs first. No app names a provider or a model, so a model Comfy adds appears in the list of its task with no change to Rosesfield.

1. **The Router catalog.** The gateway reads `GET https://api.comfy.org/v2/models` with your Comfy key, page by page, then each model's form from `GET /v2/models/{provider}/{model}/openapi.json`. Before a key connects, it reads Comfy's public schemas listed in `https://docs.comfy.org/llms.txt`. The code is `packages/generation/src/infrastructure/router/`.
2. **One cache for every visitor.** The catalog and the forms stay in memory for one hour, then each form is read again with its `ETag`, so an unchanged form answers `304`. A second visitor's list opens from the cache.
3. **The task of each model.** `packages/catalog/src/comfy/model-tasks.ts` reads each model's task from its form: the inputs it takes and the output it makes. `packages/catalog/src/comfy/list-models.ts` lists every model of the app's task.
4. **The form.** A model's fields come from its schema, with the schema's defaults and limits. A field the schema marks as internal stays hidden. Every key the schema requires is a field on the form, at any depth, in the items of a list too. A key the schema lists values for is a choice. The body puts each value back at its schema path. The check is `packages/generation/test/infrastructure/router-schemas.test.ts`. It walks the recorded schema of every hosted model the catalog lists. For each one, a body built from the form validates against the schema. A model the form cannot represent fails that test by name.
5. **The graphs.** The graphs in `workflows/` join the list of the task they run, run by Comfy Cloud through the Comfy API v2, or by your own ComfyUI behind comfy-api-proxy. Each is marked Open weights.
6. **The deny list.** `packages/catalog/src/comfy/model-deny.ts` hides every Wan model and every model named after the product the challenge is named after. It is data, and a test replays a catalog that holds one.
7. **The facts and the marks.** `packages/catalog/src/comfy/model-facts.json` holds each model's facts with their sources, such as its open weights. `packages/catalog/src/comfy/proven-families.ts` marks each maker whose model ran in Rosesfield, with the date.
8. **The price.** Generate shows the price in Comfy credits before you press it: the measured price of that model at those settings once one run was made, otherwise Comfy's estimate or its published rate card, otherwise Price unknown. After the run, History shows its real credits from the balance route.

Each hosted model's licence and terms are its maker's, and Comfy's terms govern every run.

## The licence of each graph

Each row names the licences of the weights the graph loads, and each custom node pack it needs. Each graph's README lists every file with its model folder, its download link and its licence.

| Graph | Weights | Custom node packs |
|---|---|---|
| [`ads-flux-2-klein-4b`](../workflows/ads-flux-2-klein-4b/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`ads-qwen-image-edit-2511`](../workflows/ads-qwen-image-edit-2511/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`angles-qwen-image-edit-2511`](../workflows/angles-qwen-image-edit-2511/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`angles-set-qwen-image-edit-2511`](../workflows/angles-set-qwen-image-edit-2511/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`audio-music-minimax-music-3`](../workflows/audio-music-minimax-music-3/README.md) | [MiniMax-Music3 Community License](https://huggingface.co/MiniMaxAI/MiniMax-Music3/blob/fbdf52fbaaca799592917417eb05f1899f1255ec/LICENSE) | none |
| [`audio-sound-stable-audio-3`](../workflows/audio-sound-stable-audio-3/README.md) | [Stability AI Community License](https://stability.ai/community-license-agreement) | none |
| [`audio-voice-change-chatterbox`](../workflows/audio-voice-change-chatterbox/README.md) | [MIT](https://opensource.org/license/mit) | ComfyUI_Fill-ChatterBox, MIT per its README |
| [`background-removal-solid-color`](../workflows/background-removal-solid-color/README.md) | [MIT](https://opensource.org/license/mit) | none |
| [`background-removal-transparent`](../workflows/background-removal-transparent/README.md) | [MIT](https://opensource.org/license/mit) | none |
| [`characters-angles-qwen-image-edit-2511`](../workflows/characters-angles-qwen-image-edit-2511/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`characters-traits-flux-2-klein-4b`](../workflows/characters-traits-flux-2-klein-4b/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`characters-traits-qwen-image-2512`](../workflows/characters-traits-qwen-image-2512/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`characters-traits-z-image-turbo`](../workflows/characters-traits-z-image-turbo/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`edit-qwen-image-edit-2511`](../workflows/edit-qwen-image-edit-2511/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`effects-ltx-2-5`](../workflows/effects-ltx-2-5/README.md) | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) for LTX 2.5 and its text encoder, [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) for Qwen Image Edit 2511, [MIT](https://opensource.org/license/mit) for BiRefNet | ComfyUI-WanVideoWrapper, Apache-2.0. ComfyUI_AudioTools, MIT |
| [`expand-format-qwen-image`](../workflows/expand-format-qwen-image/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`expand-sides-qwen-image`](../workflows/expand-sides-qwen-image/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`image-ming-image-0-1-design`](../workflows/image-ming-image-0-1-design/README.md) | [MIT](https://opensource.org/license/mit) | none |
| [`image-qwen-image-2512`](../workflows/image-qwen-image-2512/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`image-z-image-turbo`](../workflows/image-z-image-turbo/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`layers-edit-qwen-image-edit-2511`](../workflows/layers-edit-qwen-image-edit-2511/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`layers-fill-qwen-image`](../workflows/layers-fill-qwen-image/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`layers-split-qwen-image-layered`](../workflows/layers-split-qwen-image-layered/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`lipsync-photo-ltx-2-3`](../workflows/lipsync-photo-ltx-2-3/README.md) | [LTX-2 Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2), [Gemma Terms of Use](https://ai.google.dev/gemma/terms) for the text encoder | none |
| [`motion-ltx-2-3-ic-lora`](../workflows/motion-ltx-2-3-ic-lora/README.md) | [LTX-2 Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2), [Gemma Terms of Use](https://ai.google.dev/gemma/terms) for the text encoder, [MIT](https://opensource.org/license/mit) for SDPose. The licence of the upstream RT-DETR v4 weights was not read | none |
| [`relight-qwen-image-edit-2509`](../workflows/relight-qwen-image-edit-2509/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`storyboard-qwen-image-edit-2511`](../workflows/storyboard-qwen-image-edit-2511/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`try-on-qwen-image-edit-2511`](../workflows/try-on-qwen-image-edit-2511/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`upscale-image-seedvr2`](../workflows/upscale-image-seedvr2/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`upscale-video-seedvr2`](../workflows/upscale-video-seedvr2/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`video-edit-background-birefnet`](../workflows/video-edit-background-birefnet/README.md) | [MIT](https://opensource.org/license/mit) | none |
| [`video-edit-frame-rate-film`](../workflows/video-edit-frame-rate-film/README.md) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | none |
| [`video-edit-reframe-ltx-2-3`](../workflows/video-edit-reframe-ltx-2-3/README.md) | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x), [Gemma Terms of Use](https://ai.google.dev/gemma/terms) for the text encoder, and [its own licence](https://huggingface.co/oumoumad/LTX-2.3-22b-IC-LoRA-Outpaint) for the outpainting IC-LoRA | ComfyUI-LTXVideo, LTX-2 Community License |
| [`video-ltx-2-5-start-frame`](../workflows/video-ltx-2-5-start-frame/README.md) | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | none |
| [`video-ltx-2-5-text`](../workflows/video-ltx-2-5-text/README.md) | [LTX-2.x Community License](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) | none |
| [`voice-chatterbox`](../workflows/voice-chatterbox/README.md) | [MIT](https://opensource.org/license/mit) | ComfyUI_Fill-ChatterBox, MIT per its README |

The graphs themselves are MIT, like the rest of the repository. Each follows an official template in Comfy-Org/workflow_templates, which is MIT, and its notice is in `workflows/NOTICE`.

- **LTX-2 and LTX-2.x Community License.** Lightricks gates the LTX files on Hugging Face, so accept the licence there before you download them. Read its terms for the revenue limit on commercial use and the uses its attachment bans.
- **Gemma Terms of Use.** Google's terms for the Gemma text encoders, with their use policy.
- **Stability AI Community License.** Stability's terms for Stable Audio 3, with a revenue limit on commercial use.
- **MiniMax-Music3 Community License.** MiniMax's terms for MiniMax-Music3.
