# Video edit: replace the background of a clip with one color

Finds the subject of every frame of your clip with BiRefNet and places it over one flat color, with the sound kept or left out. Built from Comfy's template utility_birefnet_remove_background.

| | |
|---|---|
| Workflow id | `video-edit-background-birefnet` |
| Run by | [`video-edit`](../../packages/catalog/src/video-edit/) |
| Core model | BiRefNet |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | The model files it loads add up to 0.4 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `source` | 1 `LoadVideo` | `file` | an uploaded video |
| `keepSound` | 12 `PrimitiveBoolean` | `value` | a value |
| `color` | 10 `EmptyImage` | `color` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 15 `SaveVideo` | `images` | video |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `birefnet.safetensors` | BiRefNet, by ZhengPeng7 | [MIT](https://huggingface.co/ZhengPeng7/BiRefNet) | `models/background_removal` | [Hugging Face](https://huggingface.co/Comfy-Org/BiRefNet/resolve/main/background_removal/birefnet.safetensors) |

## Files

- [`video-edit-background-birefnet.api.json`](video-edit-background-birefnet.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`video-edit-background-birefnet.json`](video-edit-background-birefnet.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script writes it from the API file with the node definitions of ComfyUI v0.41.0.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `utility_birefnet_remove_background` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened.

## Checked

Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
