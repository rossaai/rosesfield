# Workflows

Every ComfyUI workflow Rosesfield runs. Each workflow has its own folder with two graphs: one you open in ComfyUI, and one the engine runs.

## What the folder holds

```
workflows/
  README.md
  NOTICE                  Comfy Org's MIT notice, for graphs that follow its templates
  sam-license.txt         the SAM License, for the workflows that load SAM 3.1
  <id>/
    <id>.api.json         the API file, the graph every engine runs
    <id>.json             the UI file, the same graph with positions, groups and a note
    entry.json            the catalog entry: the inputs, the outputs and the models
    README.md             what it makes, its models and licences, its inputs and outputs
    <id>-1.webp           a thumbnail from a real run, absent until one exists
```

- 32 workflows cover the model pipelines the apps run, listed in §The workflows by model. A workflow two apps run lives once, and each app sets its own inputs.
- Every graph runs open weights, except a graph that runs a Comfy partner node listed in `docs/models.md` §Graphs that run a partner node. No graph makes a Comfy Router call. The catalog test `open-weights.test.ts` checks every app's bindings.
- `bun run catalog:sync` lists every folder in `packages/catalog/src/workflows.gen.ts`. It refuses a folder without `entry.json`, `<id>.json` and `<id>.api.json`.
- A workflow is proven by one Generate in the running app on its app's screen, on a real input. No script runs a paid model. `bun scripts/checks/output-files/check-output-files.ts --library <gateway>` then checks each output in the library.
- An app binds a task with `taskBinding`. Its model choice runs a hosted model from the Comfy Router catalog, or one of these workflows as the task's open-weights graphs, through the same engine port.

## One workflow

### The id

`<id>` is kebab-case and names the app or the output, then the model: `effects-ltx-2-5`. It is also the folder's name, and it fits the name rule of Comfy's template library, `^[a-zA-Z0-9._-]+$`.

### The API file, `<id>.api.json`

The file every engine runs.

- ComfyUI's API format. Each node keeps its id, its `class_type`, its inputs and its `_meta.title`.
- The Comfy API takes only this format. `POST /api/v2/jobs` takes the graph verbatim and refuses a UI file with `workflow_format_ui`. `@comfyorg/sdk` 0.5.0 throws `WorkflowFormatUi` before it sends one. A ComfyUI behind comfy-api-proxy takes the same file.
- The catalog imports it through `workflows.gen.ts`. An app's binding names the workflow by its id and binds each input by its name in `entry.json`.
- An app may patch a copy of the graph per run variant, as Video's `withoutSound` and the Effects recipes do. A patch may set values, remove nodes and add unbound nodes. Every node a binding sets is in the API file.

### The UI file, `<id>.json`

The file a person drops into ComfyUI.

- ComfyUI's UI format at `version: 0.4`, the version of the official templates.
- One flat graph with groups. No subgraph and no blueprint. Every node keeps the id it has in the API file.
- One `MarkdownNote` that says what the workflow makes and names each model's licence, with a link.
- On every loader node, `properties.models` lists each model as `{ name, url, hash, hash_type, directory }`: the file name, its Hugging Face link, its SHA256 and its model folder. Gated files, such as Lightricks' LTX 2.5 files, carry no hash, because Hugging Face hides it.
- ComfyUI shows a download button for a model only when its `url` starts with `https://huggingface.co/` or Civitai, and its name ends in `.safetensors`, `.sft`, `.ckpt`, `.pth` or `.pt`.
- Each core node carries `cnr_id: "comfy-core"` and `ver: "0.41.0"`. A node from a pack carries the pack's registry id, its repository as `aux_id` and its commit as `ver`.
- `extra.linearData` lists the value inputs the catalog binds, so the workflow opens in App Mode with the inputs the app shows.
- A node the API file does not hold is UI-only: the `MarkdownNote`, and any node with mode 2, muted. Effects holds its recipe nodes and two preview nodes muted, so you can turn them on.

A script wrote every UI file from its API file with the node definitions of ComfyUI v0.41.0, read from source. No ComfyUI loaded or saved one yet. Before release, open each file in ComfyUI, check it, and save it again with Export, per §Build a workflow.

### `entry.json`

- One entry per workflow, read by `packages/catalog/src/list-workflows.ts`. Its field names come from Comfy's template index and from the hub records on comfy.org: `name`, `title`, `description`, `mediaType`, `openSource`, `models` and `requiresCustomNodes`, then `partnerNodes`, the partner nodes the graph runs, then `inputBindings`, which maps each input to a `nodeId` and an `inputName` as `scalar` or `cloud-asset`, then `outputs`, each with `nodeId`, `key` and `kind`.
- `models` lists the files the API file loads, or the model names the app's history records. A run records every model of its workflow's entry.

### `index.json`

One file for the whole folder that a sync writes from the entries, with the apps that run each workflow and the paths of both files. It is not written yet. Its sync belongs in `packages/catalog/scripts/` beside `workflows-sync.ts`.

### The thumbnail, `<id>-1.webp`

- It comes from a real run, never from the demo engine.
- WebP, 512 or 768 px wide, under 1 MB.
- A `compareSlider` or `hoverDissolve` thumbnail adds `<id>-2.webp`.

### The gate test for each pair

`packages/catalog/test/workflows/workflow-pair.test.ts` reads every folder:

- Every UI node that is not UI-only has the same id and `class_type` in the API file, and every API node is in the UI file.
- Every UI link between nodes the API file holds appears in the API file as `[origin id, slot]` on the same input name, and every link in the API file appears in the UI file.
- Every file a loader lists in `properties.models` is the file its widget holds, with a Hugging Face link.
- The test needs no running ComfyUI and no `object_info`.

## The workflows by model

| Core model | Workflows |
|---|---|
| LTX 2.5 | `effects-ltx-2-5`, `video-ltx-2-5-text`, `video-ltx-2-5-start-frame` |
| LTX 2.3 | `lipsync-photo-ltx-2-3`, `motion-ltx-2-3-ic-lora`, `video-edit-reframe-ltx-2-3` |
| Qwen Image Edit 2511 | `ads-qwen-image-edit-2511`, `angles-qwen-image-edit-2511`, `angles-set-qwen-image-edit-2511`, `edit-qwen-image-edit-2511`, `layers-edit-qwen-image-edit-2511`, `storyboard-qwen-image-edit-2511`, `try-on-qwen-image-edit-2511` |
| Qwen Image Edit 2509 | `relight-qwen-image-edit-2509` |
| Qwen Image 2512 | `image-qwen-image-2512` |
| Qwen Image | `expand-format-qwen-image`, `expand-sides-qwen-image`, `layers-fill-qwen-image` |
| Qwen Image Layered | `layers-split-qwen-image-layered` |
| Z-Image Turbo | `image-z-image-turbo` |
| Ming Image 0.1 Design | `image-ming-image-0-1-design` |
| SeedVR2 | `upscale-image-seedvr2`, `upscale-video-seedvr2` |
| BiRefNet | `background-removal-transparent`, `background-removal-solid-color`, `video-edit-background-birefnet` |
| FILM | `video-edit-frame-rate-film` |
| Chatterbox | `voice-chatterbox`, `audio-voice-change-chatterbox` |
| MiniMax-Music3 | `audio-music-minimax-music-3` |
| Stable Audio 3 Medium | `audio-sound-stable-audio-3` |
| Meshy 7.1, through a partner node | `three-d-meshy-image` |

One model often has several workflows, because the apps build different graphs on it: one branch per view or per scene, a prompt written from choices, a mask or a second reference. Variants of one graph, such as sound off, a lighter LoRA or a quality preset, share one workflow and differ by a patch or a bound value.

## Rules for every workflow

1. **Open weights first.** No Router call and no closed API. A partner node runs only in a graph `docs/models.md` §Graphs that run a partner node lists, and its `entry.json` names it in `partnerNodes` with `openSource` false.
2. **Core nodes first.** A workflow uses ComfyUI core nodes wherever they do the step. A custom node pack is pinned at a full commit, named in the note and the README, and listed in `requiresCustomNodes`. Four workflows load a pack: `voice-chatterbox` and `audio-voice-change-chatterbox` load ComfyUI_Fill-ChatterBox, `effects-ltx-2-5` loads ComfyUI-WanVideoWrapper and ComfyUI_AudioTools, and `video-edit-reframe-ltx-2-3` loads ComfyUI-LTXVideo. Comfy Cloud installs no pack of your own, per `docs/stack.md` §The Comfy API v2.
3. **Flat.** In the API file, a subgraph renames every inner node to `<outer id>:<inner id>`, which breaks the catalog's bindings, and the registry refuses such an id. A blueprint reaches a person only through a custom node pack or their own library. Groups and a note give the same order.
4. **Our own graphs.** Each graph follows the official template it names in its README, in Comfy-Org/workflow_templates, which is MIT. Its notice is in `NOTICE`. Lightricks' example workflows in ComfyUI-LTXVideo carry the LTX-2 Community License, so they are read for structure and never copied. ComfyUI, its frontend and comfy-cli are GPL-3.0. They are tools, and none of their code is copied here.
5. **No weights.** A workflow links each model and never ships one.

## Build a workflow

1. Install ComfyUI v0.41.0 outside this repository, as a tool. It loads and exports graphs on CPU, with no GPU.
2. Open the official template the graph comes from. The LTX 2.5 templates wrap their pipeline in one subgraph, so unpack it first.
3. Make the catalog's changes. Add the groups, the note and the model links.
4. Save the UI file with Export and the API file with `Export (API)`, both under `<id>`, in the folder `workflows/<id>/`.
5. Write `entry.json` with the inputs the binding sets and run `bun run catalog:sync`.
6. Test the file the way Comfy's template authors do. Save it with `--disable-all-custom-nodes` when the graph holds only core nodes. Then load it with its models deleted and check that every download button appears.

When only an API file exists, drop it into ComfyUI, which places the nodes on its own. Then arrange them, add the groups, the note and the model links by hand, and Export. comfy-cli 1.22.0 turns a UI file into an API file with a running server's `/object_info`.

## Load a workflow into ComfyUI

1. Drop the UI file, `<id>.json`, onto the ComfyUI canvas.
2. ComfyUI lists every missing model with a download button, from the links in the file. Each model goes to the folder the dialog names.
3. A missing custom node opens the missing-nodes dialog. Install the pack at the commit the README names, with ComfyUI-Manager or `comfy node install`.
4. Set the inputs and run. App Mode shows the inputs the Rosesfield app binds.

Open the UI file, not the API file. ComfyUI loads an API file with no positions, groups, notes or model links, places the nodes on its own and shows no download button. Its frontend marks API loading as deprecated.

On Comfy Cloud the UI file opens the same way. A workflow that needs a pack Comfy Cloud does not install runs on your own ComfyUI or on a Comfy deployment, per `docs/stack.md` §Engine targets.

## Not checked

No workflow was loaded, exported or run in ComfyUI on the machine that wrote this folder, and none ran on a live engine. Every API file was checked against the node definitions of ComfyUI v0.41.0, ComfyUI_Fill-ChatterBox at `f7d7a16187430abcaf91a3039b9c83aa9960816a` and ComfyUI-WanVideoWrapper at `088128b224242e110d3906c6750e9a3a348a659b`, read from source: each class name, input name, required input, link slot, link type and fixed value. The load, export and flatten behavior comes from reading ComfyUI's frontend source at main `a8e134a`, after release v1.58.0.
