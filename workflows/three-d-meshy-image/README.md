# 3D from a photo: a GLB with Meshy 7.1

Loads your photo of one object, sends it to Meshy 7.1 through Comfy's partner node Meshy: Image to Model, and saves the textured model it returns as a GLB file. Meshy runs on its maker's service and bills your Comfy account through your Comfy key.

| | |
|---|---|
| Workflow id | `three-d-meshy-image` |
| Run by | [`three-d`](../../packages/catalog/src/three-d/) |
| Core model | Meshy 7.1, on Meshy's service |
| Partner node | `MeshyImageToModelNode`, a ComfyUI core node in `comfy_api_nodes` |
| Custom node packs | none, every node is a ComfyUI core node |
| GPU memory | none on your machine. Meshy runs the model |

## Inputs

The catalog binds these names in [`entry.json`](entry.json). The UI file lists the value inputs for App Mode.

| Input | Node | Field | Takes |
|---|---|---|---|
| `image` | 1 `LoadImage` | `image` | an uploaded image |
| `model` | 2 `MeshyImageToModelNode` | `model` | `meshy-7.1`, `meshy-7`, `meshy-6` or `latest` |
| `seed` | 2 `MeshyImageToModelNode` | `seed` | a number. Meshy's results vary whatever the seed |

## Settings the graph fixes

| Field | Value | Why |
|---|---|---|
| `should_remesh` | `true`, with `topology` `triangle` and `target_polycount` 30,000 | a mesh light enough for a game or a scene. 30,000 is the remesh default of Meshy's API |
| `symmetry_mode` | `auto` | Meshy's default |
| `should_texture` | `true`, with `enable_pbr` false, no texture prompt and `texture_resolution` `2k` | a textured model, at the smallest texture |
| `pose_mode`, `ultra_mode` | none, false | no pose and no extra pass |

`should_remesh` and `should_texture` are dynamic combos. The API file writes each one as its choice, `"true"`, and each field of that choice under the combo's name and a dot, such as `should_remesh.target_polycount`. ComfyUI at `8713616fcc321624e306bbd36be5906203dcb0dc` reads them that way in `comfy_api/latest/_io.py`: `finalize_prefix` joins the names with a dot and `build_nested_inputs` gives the node one dictionary per combo.

## Outputs

| Node | Key | Kind |
|---|---|---|
| 3 `SaveGLB` | `3d` | mesh |

## Price

Comfy bills the run in credits through your key. Its price badge in Comfy Cloud's object_info of 2026-10-19 counts 30 Meshy credits for a textured model at 2k, at 0.0572 USD each.

## Files

- [`three-d-meshy-image.api.json`](three-d-meshy-image.api.json) is the graph every engine runs, in ComfyUI's API format. The catalog imports it.
- [`three-d-meshy-image.json`](three-d-meshy-image.json) is the same graph in ComfyUI's UI format, with positions, groups and one note. A script writes it from the API file.
- [`entry.json`](entry.json) is the catalog entry: the inputs, the outputs, the model and the partner node.

## Terms

Meshy 7.1 is a closed model. Each run is governed by [Meshy's terms](https://www.meshy.ai/terms-of-use) and [Comfy's terms](https://www.comfy.org/terms-of-service), which name partner nodes. Read Meshy's terms for who owns what a run makes on your plan.

## Checked

Its class names, input names and link slots were checked against Comfy Cloud's object_info of 2026-10-19 and the source of ComfyUI at `8713616fcc321624e306bbd36be5906203dcb0dc`. The order of the widget values in the UI file follows the order of the node's inputs.
