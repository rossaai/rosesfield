# Remove background: a transparent PNG with BiRefNet

Finds the subject of your image with a BiRefNet model and saves the image with everything behind the subject made transparent. The model file is an input, so the same graph runs BiRefNet and Lucida. Built from Comfy's template utility_birefnet_remove_background.

| | |
|---|---|
| Workflow id | `background-removal-transparent` |
| Run by | [`background-removal`](../../packages/catalog/src/background-removal/) |
| Core model | BiRefNet |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | The model files it loads add up to 0.4 GB. |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `image` | 1 `LoadImage` | `image` | an uploaded image |
| `model` | 2 `LoadBackgroundRemovalModel` | `bg_removal_name` | a value |

## Outputs

| Node | Key | Kind |
|---|---|---|
| 9 `SaveImage` | `images` | image |

## Models

Rosesfield ships no weights. Each file goes into the model folder its row names.

| File | Model | Licence | Folder | Download |
|---|---|---|---|---|
| `birefnet.safetensors` | BiRefNet, by ZhengPeng7 | [MIT](https://huggingface.co/ZhengPeng7/BiRefNet) | `models/background_removal` | [Hugging Face](https://huggingface.co/Comfy-Org/BiRefNet/resolve/main/background_removal/birefnet.safetensors) |

## Files

- [`background-removal-transparent.api.json`](background-removal-transparent.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`background-removal-transparent.json`](background-removal-transparent.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. Each loader lists its file with a download link. A script writes it from the API file with the node definitions of ComfyUI v0.41.0.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs and the models.

## Source

Its nodes follow Comfy's template `utility_birefnet_remove_background` in [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates), MIT, read on 2026-10-17, with the subgraphs opened.

## Checked

Its class names, input names, required inputs, link types and fixed values were checked against the node definitions of ComfyUI v0.41.0, read from source.
