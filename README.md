# Rosesfield

Make images and video with apps that share one library, on your own key.

Rosesfield is an open-source creative platform. Every app adds to one library, one set of characters and one history. Every app is also an API route and an MCP tool. [Comfy](https://comfy.org) is the engine.

You bring your own engine and run Rosesfield on your machine. It has no accounts, no payments and no credits.

## Why Rosesfield exists

Rosesfield exists so you can make images and video with many apps in one place, on your own key.

- **One library.** Every app takes its inputs from the same library and adds its outputs to it. An output of one app can be the input of the next.
- **Your own key.** Each run is charged to your own engine account. Rosesfield sells nothing, so it shows no credits, plans, discounts or countdowns.
- **Open code.** Every app works fully from this repository with your own key. The code is under the MIT licence.

## Status

Rosesfield started as an entry to Comfy's open-source app challenge.

No run has reached a real model. No Comfy key and no agent model key exist on the machine that built the apps, so each part was built against Comfy's published specs, replayed responses and the demo engine. Without a key, the demo engine runs the screens. Its outputs are neutral placeholders: flat gray images, a flat video and silent audio. Each one is marked Demo engine on screen, and no model made it.

The commands in this README ran on macOS with bun 1.4.3 and Node 24.11.1 on 2026-10-18, from a clean `bun install` of a copy of this tree. A line says so where a command was not run.

### What runs

- **The server.** It runs on bun with Hono. A SQLite file holds your runs, characters and conversations, and a folder on disk holds your assets. It has an owner lock, one API route per app and an MCP endpoint at `/mcp`.
- **The web app.** It has Welcome, Home, Apps, Library, Characters, History, Agent, Connect and Settings.
- **The catalog.** It holds 20 apps. A gateway test starts each one through its API route on the demo engine. The MCP endpoint lists 20 app tools and 3 library tools.
- **The engine adapters.** One speaks the Comfy API v2 and one speaks RunPod Serverless. Their tests replay responses written from the published specs. For each engine target below, the server starts and reports that target.
- **Public mode.** The server keeps no key of its own, and each visitor brings theirs. It refuses to start with an engine key, an agent key or an owner token set. Its tests pass.
- **The agent.** It runs apps for you on a Comfy Router chat model with your Comfy key, and it can propose a run for you to accept or skip. Its tests replay hand-written Router answers. No live turn has run yet.
- **The workflows.** `workflows/` holds 51 ComfyUI workflows, each with an API file, a UI file, an `entry.json` and a README. A catalog test reads every pair. A second catalog test refuses an app binding that is not a ComfyUI workflow, or that uses a partner node it lists. Reading the 138 node class names in the API files shows no partner node. List the `class_type` values to check.
- **First light.** `scripts/first-light/` sends each workflow once to the engine you name. It refuses to start without a key, and its tests replay Comfy and RunPod responses written from the published specs.
- **The gate.** `bun run gate` passes on a clean install.

### What does not run

- **A live run.** No run reached Comfy Cloud, a Comfy deployment, your ComfyUI, a RunPod pod, a Modal Server or RunPod Serverless. No workflow was loaded in ComfyUI. No workflow has a thumbnail from a real run.
- **An agent model.** No model has answered the agent. The agent is off until you set one.
- **Remake.** Its definition, screen and tests exist. The server does not list it, because its folder holds `remake-app.ts` and not `app.ts`, so `catalog:sync` skips it.
- **Voice and clip Lip sync without their node packs.** Voice loads ComfyUI_Fill-ChatterBox and clip Lip sync loads ComfyUI-WanVideoWrapper. An engine runs those two workflows only with the pack installed.
- **Cloudflare.** A Worker entry exists at `services/gateway/src/worker.ts`, and `bun run --filter @rosesfield/gateway test:worker` passes. It was not deployed, and this README has no deploy steps.
- **A hosted demo.** None exists.
- **Desktop and phone apps.** Only the web app exists.

## Apps

Ads, Angles, Background removal, Characters, Effects, Expand, Headshots, Image, Layers, Lip sync, Motion, Recast, Relight, Shot, Storyboard, Try-on, Upscale, Video, Video edit and Voice.

Each app runs the workflows that name it in `workflows/`, per [workflows/README.md](workflows/README.md). Effects turns one photo into a short effect video and offers eight effects. The plan and the order of the apps are in [docs/product.md](docs/product.md).

## Install

You need [bun](https://bun.sh) 1.4.3 and Node 22 or 24. Vite and the DOM tests run on Node.

```sh
git clone https://github.com/rossaai/rosesfield.git
cd rosesfield
bun install
```

`bun install` links every workspace from `bun.lock`. The clone address was checked with `git ls-remote`, and the clone itself was not run.

## Run it

### With the demo engine

```sh
bun run dev
```

Open `http://localhost:5173`. The server listens on `http://127.0.0.1:8787`, and the web app proxies `/api` and `/mcp` to it. `bun run dev` always uses the demo engine, even when `.env` holds a key, so it never spends your key. If you change `PORT`, set `ROSESFIELD_GATEWAY` to the server's address before you run it.

### With your own engine

```sh
cp .env.example .env
```

Set the variables of your engine target in `.env`, per [Engine targets](#engine-targets). Then build the web app and start the server.

```sh
bun run build
bun run --filter @rosesfield/gateway start
```

Open `http://127.0.0.1:8787`. The server serves the built web app and the API from one address. It prints which engine it uses when it starts, and Settings shows the same. With no engine target set, it uses the demo engine.

### Variables

| Variable | What it sets | Default |
|---|---|---|
| `COMFY_API_KEY` | Your Comfy key, or the token of a comfy-api-proxy. | empty |
| `COMFY_BASE_URL` | The address of a Comfy API v2. Empty with a key reaches Comfy Cloud. | empty |
| `RUNPOD_ENDPOINT_ID` | The RunPod Serverless endpoint. It cannot be set with `COMFY_BASE_URL`. | empty |
| `RUNPOD_API_KEY` | The key for that endpoint. It needs `RUNPOD_ENDPOINT_ID`. | empty |
| `OWNER_TOKEN` | The token every request must carry as `Authorization: Bearer <token>`, at least 32 characters. Optional on `127.0.0.1`. | empty |
| `HOST` | The address the server listens on. A server that listens beyond `127.0.0.1` without `OWNER_TOKEN` refuses to start. | `127.0.0.1` |
| `PORT` | The port the server listens on, 1 to 65535. | `8787` |
| `DATA_DIR` | The folder for the SQLite database and your assets, relative to `services/gateway`. | `./data` |
| `MODE` | `owner` or `public`, per [Public mode](#public-mode). | `owner` |
| `SESSION_SECRET` | Public mode only. Signs each visitor's session, at least 32 characters. | empty |
| `RETENTION_DAYS` | Public mode only. The days the server keeps a visitor's runs, assets, characters and conversations, 1 to 365. | `7` |
| `SESSION_REQUESTS_PER_MINUTE` | Public mode only. The most requests one visitor session may send each minute, 1 to 10000. | `120` |

`.env.example` lists the variables with comments.

### Engine targets

The server picks its engine target from the variables it finds. It reads the target of a `COMFY_BASE_URL` from the address. The server prints the target at start, `GET /api/settings` reports it, and Settings shows it. For each target below, the server started and reported that target. No target ran a live request.

| Target | Server variables |
|---|---|
| Comfy Cloud | `COMFY_API_KEY` |
| A Comfy deployment, an address that ends in `.run.comfy.app` | `COMFY_BASE_URL`, `COMFY_API_KEY` |
| Your ComfyUI behind comfy-api-proxy, any other address | `COMFY_BASE_URL`, and `COMFY_API_KEY` if the proxy has a token |
| A RunPod pod, an address that ends in `.proxy.runpod.net` | `COMFY_BASE_URL`, `COMFY_API_KEY` |
| A Modal Server, an address that ends in `.modal.run` or `.modal.direct` | `COMFY_BASE_URL`, `COMFY_API_KEY` |
| RunPod Serverless | `RUNPOD_ENDPOINT_ID`, `RUNPOD_API_KEY` |
| The demo engine | none |

The server refuses to start in these cases: `COMFY_BASE_URL` and `RUNPOD_ENDPOINT_ID` are both set, or `RUNPOD_API_KEY` is set without `RUNPOD_ENDPOINT_ID`.

Set up the engine side of each target like this. The details of each target, with prices and limits, are in [docs/stack.md](docs/stack.md) §Engine targets.

- **Comfy Cloud.** Create a key with [Comfy's guide](https://docs.comfy.org/development/api-development/getting-an-api-key). Every run spends it.
- **A Comfy deployment.** Set `COMFY_BASE_URL` to the deployment's address and `COMFY_API_KEY` to a key of the same kind as a Comfy Cloud key.
- **Your ComfyUI.** ComfyUI serves no `/api/v2` route, so run comfy-api-proxy beside it. The commands come from the package's PyPI page and were not run, because no ComfyUI exists on this machine.

  ```sh
  pip install comfy-api-proxy
  comfy-api-proxy --comfyui http://127.0.0.1:8188 --port 8189 --state-dir <folder>
  ```

  Then set `COMFY_BASE_URL=http://127.0.0.1:8189`. Load a workflow's UI file in ComfyUI, and it lists each missing model with a download button, per [workflows/README.md](workflows/README.md).
- **A RunPod pod.** Run ComfyUI and comfy-api-proxy in the pod with `--host 0.0.0.0 --token <token>`, and expose HTTP port 8189. Set `COMFY_BASE_URL=https://<pod-id>-8189.proxy.runpod.net` and `COMFY_API_KEY=<token>`.
- **A Modal Server.** Run ComfyUI and comfy-api-proxy under a Modal Server. Set `COMFY_BASE_URL` to the address the server reports, and `COMFY_API_KEY` to a Modal Proxy Token.
- **RunPod Serverless.** Deploy an endpoint on [runpod-workers/worker-comfyui](https://github.com/runpod-workers/worker-comfyui) with the models of the workflows you run. Set `RUNPOD_ENDPOINT_ID` and `RUNPOD_API_KEY`. RunPod takes no idempotency key, so the adapter sends each run once and never retries it. A video output needs the worker's bucket settings, and the stock worker drops audio, per [docs/stack.md](docs/stack.md) §RunPod Serverless.

### Public mode

Public mode lets strangers use your server on their own keys. The server holds no key, and each visitor adds theirs in Settings. The key stays in the visitor's browser and goes with each request, and the server never stores it. A visitor without a key gets the demo engine.

```sh
bun run build
MODE=public SESSION_SECRET=<32 characters or more> bun run --filter @rosesfield/gateway start
```

The server refuses to start in public mode with `COMFY_API_KEY`, `RUNPOD_API_KEY` or `OWNER_TOKEN` set, or without `SESSION_SECRET`. Each visitor reads only their own runs, assets, characters and conversations, and the server deletes them after `RETENTION_DAYS`.

### The agent

The agent runs on a chat model of the Comfy Router with your Comfy key, so it needs no setting of its own. It starts when `COMFY_API_KEY` reaches Comfy Cloud, and Settings shows it. In public mode it answers each visitor on the Comfy key that visitor adds. Each turn spends credits from that key, and the agent shows them under the turn.

The agent stays off when no Comfy key is set, and when `COMFY_BASE_URL` points at another host, because that key is not a Comfy Cloud key. Then the server prints that the agent is off, and every agent route answers `AGENT_MODEL_MISSING`. A key the Router has not turned on shows Comfy's message in Agent, and the agent stays off.

The server refuses to start with `AGENT_BASE_URL`, `AGENT_MODEL`, `AGENT_API_KEY` or `AGENT_PROVIDER` set, because the agent no longer reads them.

### Use it from Claude or your own code

Each app is an MCP tool at `/mcp` and an API route at `POST /api/apps/<app-id>/runs`. The Connect screen has the setup steps for Claude, ChatGPT and any MCP client.

```sh
curl -X POST http://127.0.0.1:8787/api/apps/image/runs \
  -H "content-type: application/json" \
  -H "Idempotency-Key: my-first-run" \
  -d '{"inputs":{"prompt":"A red bicycle leans against a white wall."}}'
curl http://127.0.0.1:8787/api/runs
```

The first command starts a run and answers with its id. The second lists your runs. With `OWNER_TOKEN` set, add `-H "Authorization: Bearer <token>"` to every request.

## First light

First light sends each workflow in `workflows/` once to the engine you name, and writes one report per workflow. It spends real GPU time, so it starts only with an engine key. Each target takes its own variables:

```sh
# Comfy Cloud
COMFY_API_KEY=<key> bun scripts/first-light/first-light.ts --inputs <folder> --only effects-ltx-2-5

# A Comfy deployment, a RunPod pod, a Modal Server, or your ComfyUI behind comfy-api-proxy
COMFY_BASE_URL=<address> COMFY_API_KEY=<key or proxy token> bun scripts/first-light/first-light.ts --inputs <folder> --only effects-ltx-2-5

# RunPod Serverless
RUNPOD_ENDPOINT_ID=<id> RUNPOD_API_KEY=<key> bun scripts/first-light/first-light.ts --inputs <folder> --only effects-ltx-2-5
```

`--only` takes workflow ids joined by commas, and every workflow runs without it. `--inputs` names a folder with the sample files for the workflows that take one: `image.png`, `video.mp4` and `audio.wav`. A workflow whose sample is missing is skipped, and its report names the file. The reports go to `data/first-light/<time>/`, which git ignores.

First light needs `COMFY_API_KEY` for every Comfy target. It refuses to start without it and names the missing setting. It also refuses when `COMFY_BASE_URL` and `RUNPOD_ENDPOINT_ID` are both set, and when `--only` names a workflow that does not exist. It exits with 1 when any workflow failed. The flags, the report fields and the bounds are in [scripts/first-light/README.md](scripts/first-light/README.md).

Checked: the three refusals above ran, and against a closed local port first light wrote a failed report and exited with 1. Not checked: any run against an engine. The test `packages/catalog/test/first-light/first-light.test.ts` runs first light against replayed responses written from the published specs.

## Check a change

```sh
bun run gate
```

The gate runs `catalog:sync`, `typecheck`, `lint` and `test`. For one workspace, run `bun run --filter @rosesfield/<workspace> typecheck` or `test`.

## Engines and licences

Comfy runs every model. Rosesfield ships no weights. A model's licence decides what you may do with what it makes, so read each one before you use an output in your work.

Every row comes from the README of a workflow in `workflows/`, which lists each file with its model folder and its download link. Each licence was read on 2026-10-18 in the model's card or repository, and in the licence text where the model has a custom licence. "Used by" lists the apps the server serves. A row that bundles files, such as the high-noise and low-noise files of one model, shows one licence for all of them.

### The core of Effects

Effects makes its video with LTX 2.5, in the workflow `effects-ltx-2-5`. That workflow loads no other video model. Its matte of the photo's subject comes from BiRefNet, listed under Upscale and background models.

| Model | Used by | Licence | Link |
|---|---|---|---|
| LTX 2.5 22B distilled, int8 | Effects, Shot, Video | LTX-2.x Community License | [Model card](https://huggingface.co/Lightricks/LTX-2.5), [Licence](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) |
| LTX 2.5 video VAE, audio VAE and 2 times latent upscaler | Effects, Shot, Video | LTX-2.x Community License | [Model card](https://huggingface.co/Lightricks/LTX-2.5), [Licence](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) |
| Gemma 4 12B text encoder with the LTX 2.5 projections, int8 | Effects, Shot, Video | LTX-2.x Community License, the licence of the repository the file sits in. The base model declares Apache-2.0. | [LTX 2.5 card](https://huggingface.co/Lightricks/LTX-2.5), [Gemma 4 card](https://huggingface.co/google/gemma-4-12B-it) |
| LTX 2.5 IC-LoRA Water Simulation, by Lightricks | Effects | LTX-2.x Community License | [Model card](https://huggingface.co/Lightricks/LTX-2.5-22b-IC-LoRA-Water-Simulation), [Licence](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) |
| LTX 2.5 IC-LoRA Day To Night, by Lightricks | Effects | LTX-2.x Community License | [Model card](https://huggingface.co/Lightricks/LTX-2.5-22b-IC-LoRA-Day-To-Night), [Licence](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) |
| LTX 2.5 LoRA Cinemagraph, by Lightricks | Effects | LTX-2.x Community License | [Model card](https://huggingface.co/Lightricks/LTX-2.5-22b-LoRA-Cinemagraph), [Licence](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) |
| LTX 2.5 LoRA Slow Motion Control, by Lightricks | Effects | LTX-2.x Community License | [Model card](https://huggingface.co/Lightricks/LTX-2.5-22b-LoRA-Slow-Motion-Control), [Licence](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x) |

Lightricks gates the LTX 2.5 files on Hugging Face, so accept the licence there before you download them. The LTX-2.x Community License of 2026-08-11 lets any entity use the models for any purpose within the limits of its Attachment A. An entity with annual revenue of at least 10,000,000 USD needs a paid agreement for any use that is not non-commercial. Attachment A bans impersonating others without their consent.

### Video and motion models

| Model | Used by | Licence | Link |
|---|---|---|---|
| Wan 2.2 text to video, A14B | Video | Apache-2.0 | [Hugging Face](https://huggingface.co/Wan-AI/Wan2.2-T2V-A14B) |
| Wan 2.2 image to video, A14B | Video, Video edit | Apache-2.0 | [Hugging Face](https://huggingface.co/Wan-AI/Wan2.2-I2V-A14B) |
| Wan 2.2 Fun Control, A14B | Video | Apache-2.0 | [Hugging Face](https://huggingface.co/alibaba-pai/Wan2.2-Fun-A14B-Control) |
| Wan 2.2 Fun Control Camera, A14B | Shot, Video | Apache-2.0 | [Hugging Face](https://huggingface.co/alibaba-pai/Wan2.2-Fun-A14B-Control-Camera) |
| Wan 2.1 VACE, 14B | Recast, Video edit | Apache-2.0 | [Hugging Face](https://huggingface.co/Wan-AI/Wan2.1-VACE-14B) |
| Wan Animate 2 Distill, int8 | Motion | Apache-2.0 | [Hugging Face](https://huggingface.co/Wan-AI/Wan-Animate-2-14B) |
| SCAIL-2 on Wan 2.1 14B, and its DPO LoRA | Recast | MIT | [Hugging Face](https://huggingface.co/zai-org/SCAIL-2) |
| Wan 2.1 image to video, 14B 480P | Lip sync | Apache-2.0 | [Hugging Face](https://huggingface.co/Wan-AI/Wan2.1-I2V-14B-480P) |
| InfiniteTalk, single-speaker patch | Lip sync | Apache-2.0 | [Hugging Face](https://huggingface.co/MeiGen-AI/InfiniteTalk) |
| Wan 2.1 I2V 480P step-distill LoRA, by lightx2v | Lip sync, Recast | Apache-2.0 | [Hugging Face](https://huggingface.co/lightx2v/Wan2.1-I2V-14B-480P-StepDistill-CfgDistill-Lightx2v) |
| SAM 3.1, by Meta | Recast | SAM License, a custom Meta licence | [Licence](https://github.com/facebookresearch/sam3/blob/main/LICENSE) |
| FILM frame interpolation | Video edit | Apache-2.0 for the code. The repackage the workflow downloads lists mit-and-apache-2.0 for FILM and RIFE together. | [GitHub](https://github.com/google-research/frame-interpolation), [Repackage](https://huggingface.co/Comfy-Org/frame_interpolation) |

The SAM License allows use, copying, distribution and changes. It requires its text to travel with any copy, and its text is in [workflows/sam-license.txt](workflows/sam-license.txt). It bars end uses that trade controls prohibit, including military or warfare purposes.

### Image models

| Model | Used by | Licence | Link |
|---|---|---|---|
| FLUX.2 Klein 4B, bf16 and fp8 | Ads, Characters, Image, Storyboard, Try-on | Apache-2.0 | [Hugging Face](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B) |
| Z-Image Turbo | Characters, Image | Apache-2.0 | [Hugging Face](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo) |
| Qwen Image 2512, fp8 | Characters, Image, Storyboard | Apache-2.0 | [Hugging Face](https://huggingface.co/Qwen/Qwen-Image-2512) |
| Qwen Image, fp8 | Expand, Layers | Apache-2.0 | [Hugging Face](https://huggingface.co/Qwen/Qwen-Image) |
| Qwen Image Edit 2511, bf16 and fp8 mixed | Ads, Angles, Characters, Headshots, Layers, Relight, Storyboard, Try-on | Apache-2.0 | [Hugging Face](https://huggingface.co/Qwen/Qwen-Image-Edit-2511) |
| Qwen Image Edit 2509, fp8 | Relight | Apache-2.0 | [Hugging Face](https://huggingface.co/Qwen/Qwen-Image-Edit-2509) |
| Qwen Image Layered, bf16 | Layers | Apache-2.0 | [Hugging Face](https://huggingface.co/Qwen/Qwen-Image-Layered) |
| Qwen Image Edit 2511 Lightning 4-step LoRA, by lightx2v | Angles, Characters, Layers, Relight, Try-on | Apache-2.0 | [Hugging Face](https://huggingface.co/lightx2v/Qwen-Image-Edit-2511-Lightning) |
| Qwen Image Edit 2509 Lightning 4-step LoRA, by lightx2v | Relight | Apache-2.0 | [Hugging Face](https://huggingface.co/lightx2v/Qwen-Image-Lightning) |
| Qwen Image Lightning 4-step LoRA, by lightx2v | Expand | Apache-2.0 | [Hugging Face](https://huggingface.co/lightx2v/Qwen-Image-Lightning) |
| Qwen Image Edit 2511 Multiple Angles LoRA, by fal | Angles, Characters | Apache-2.0 | [Hugging Face](https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA) |
| Qwen Image Edit 2509 Relight LoRA, by dx8152 | Relight | Apache-2.0 | [Hugging Face](https://huggingface.co/dx8152/Qwen-Image-Edit-2509-Relight) |
| Qwen Image inpainting ControlNet, by InstantX | Expand | Apache-2.0 | [Hugging Face](https://huggingface.co/InstantX/Qwen-Image-ControlNet-Inpainting) |
| Qwen Image DiffSynth inpaint patch | Layers | Apache-2.0, from the card of Comfy's repackage | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image-DiffSynth-ControlNets) |

### Upscale and background models

| Model | Used by | Licence | Link |
|---|---|---|---|
| SeedVR2 3B, int8, with its VAE | Upscale | Apache-2.0 | [Hugging Face](https://huggingface.co/ByteDance-Seed/SeedVR2-3B) |
| SeedVR2 7B, int8 | Upscale | Apache-2.0 | [Hugging Face](https://huggingface.co/ByteDance-Seed/SeedVR2-7B) |
| Real-ESRGAN x4plus | Upscale | BSD-3-Clause | [GitHub](https://github.com/xinntao/Real-ESRGAN) |
| BiRefNet, by ZhengPeng7 | Background removal, Effects, Video edit | MIT | [Hugging Face](https://huggingface.co/ZhengPeng7/BiRefNet) |
| Lucida, by egeorcun | Background removal | MIT. Some of its training datasets are distributed for research use, and the card asks you to check that they suit your use. | [Hugging Face](https://huggingface.co/egeorcun/lucida) |

SeedVR2 7B and Lucida are not in the model tables of their workflows. Those workflows take the model file as an input and run either size or either model, and their READMEs say so.

### Voice model

| Model | Used by | Licence | Link |
|---|---|---|---|
| Chatterbox Multilingual, by Resemble AI | Voice | MIT. With resemble-perth installed, every output carries Resemble's hidden watermark. | [Hugging Face](https://huggingface.co/ResembleAI/chatterbox) |

### Parts the workflows load

| Model | Used by | Licence | Link |
|---|---|---|---|
| Qwen2.5-VL 7B text encoder, fp8 | Ads, Angles, Characters, Expand, Headshots, Image, Layers, Relight, Storyboard, Try-on | Apache-2.0 on the base model's card. The repackage the workflows download from lists the Tencent Hunyuan Community License. | [Base model](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct), [Repackage](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged) |
| Qwen Image VAE | Ads, Angles, Characters, Expand, Headshots, Image, Layers, Relight, Storyboard, Try-on | Apache-2.0 | [Hugging Face](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI) |
| Qwen Image Layered VAE | Layers | Apache-2.0 | [Hugging Face](https://huggingface.co/Qwen/Qwen-Image-Layered) |
| Qwen3 4B text encoder | Ads, Characters, Image, Storyboard, Try-on | Apache-2.0 | [Hugging Face](https://huggingface.co/Qwen/Qwen3-4B) |
| FLUX.2 VAE | Ads, Characters, Image, Storyboard, Try-on | Not settled. The workflows say Apache-2.0. The card of the repository they download it from lists the FLUX.1 dev non-commercial licence. Comfy's FLUX.2 Klein 4B repackage lists Apache-2.0 for a file of the same name, which differs in size. | [Download repository](https://huggingface.co/Comfy-Org/flux2-dev), [Klein 4B repackage](https://huggingface.co/Comfy-Org/vae-text-encorder-for-flux-klein-4b) |
| Z-Image VAE | Characters, Image | Apache-2.0 | [Hugging Face](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo) |
| umt5-xxl text encoder, fp8, fp16 and Kijai's bf16 encoder | Lip sync, Motion, Recast, Shot, Video, Video edit | Apache-2.0 | [Hugging Face](https://huggingface.co/google/umt5-xxl) |
| Wan 2.1 VAE, and Kijai's build | Lip sync, Motion, Recast, Shot, Video, Video edit | Apache-2.0 | [Hugging Face](https://huggingface.co/Wan-AI/Wan2.1-I2V-14B-480P) |
| CLIP ViT-H vision encoder | Lip sync, Motion, Recast | MIT | [Hugging Face](https://huggingface.co/laion/CLIP-ViT-H-14-laion2B-s32B-b79K) |
| chinese-wav2vec2-base audio encoder | Lip sync | MIT | [Hugging Face](https://huggingface.co/TencentGameMate/chinese-wav2vec2-base) |

Kijai's builds of the Wan 2.1 VAE, the umt5-xxl encoder, the InfiniteTalk patch and the step-distill LoRA sit in a repository whose card names no licence. Their rows carry the licence of the original model.

### Node packs

A node pack is code, not weights. Each workflow that needs one pins it at a full commit.

| Pack | Used by | Licence | Link |
|---|---|---|---|
| ComfyUI_Fill-ChatterBox at `f7d7a16187430abcaf91a3039b9c83aa9960816a` | Voice | MIT in its README. The repository has no LICENSE file. | [GitHub](https://github.com/filliptm/ComfyUI_Fill-ChatterBox/tree/f7d7a16187430abcaf91a3039b9c83aa9960816a) |
| ComfyUI-WanVideoWrapper at `088128b224242e110d3906c6750e9a3a348a659b` | Lip sync | Apache-2.0 | [GitHub](https://github.com/kijai/ComfyUI-WanVideoWrapper/tree/088128b224242e110d3906c6750e9a3a348a659b) |

### The agent's model

The agent uses a chat model of the Comfy Router, with your Comfy key. Rosesfield ships no model. You choose one in Agent from the Router chat models that take tools, per [docs/stack.md](docs/stack.md) §The agent's model. Each model's licence is its maker's.

## Licence

The code, the docs and the design tokens are under the [MIT licence](LICENSE). The Rosesfield name and logo are trademarks of ROSSA AI, LLC. [TRADEMARKS.md](TRADEMARKS.md) says how you can use them.

Every deployment serves a [Privacy](apps/platform/src/screens/legal/privacy-screen.tsx) page at `/privacy` and a [Terms](apps/platform/src/screens/legal/terms-screen.tsx) page at `/terms`.

## Official source

The official repository is https://github.com/rossaai/rosesfield. A copy with a similar name is not official.

## Who makes it

Rosesfield is made and owned by ROSSA AI, LLC.

If your company wants to sponsor Rosesfield, write to partner@rosesfield.com.
