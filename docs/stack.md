# Stack

> The packages, versions and services Rosesfield runs on, the engine targets it reaches, the voice model and the agent's model. Every npm version is the `latest` tag read on 2026-10-17. A version outside npm is named where it is used, with its source and date. Pre-releases are refused. Pin exact versions and commit `bun.lock`.

## The stack

| Layer | Choice | Version | Licence |
|---|---|---|---|
| runtime on your machine | bun | 1.4.3 | MIT |
| build | vite, @vitejs/plugin-react | 8.3.4, 6.1.2 | MIT |
| UI | react, react-dom | 19.3.1 | MIT |
| CSS | tailwindcss, @tailwindcss/vite | 4.3.3 | MIT |
| components | shadcn CLI, @base-ui/react | 4.22.0, 1.9.0 | MIT |
| routing | @tanstack/react-router, @tanstack/router-plugin | 1.170.45, 1.168.47 | MIT |
| server state | @tanstack/react-query | 5.104.3 | MIT |
| installable app | vite-plugin-pwa | 2.0.0 | MIT |
| fonts | @fontsource/montserrat, @fontsource/jetbrains-mono | read at install | OFL 1.1 |
| icons | lucide-react | read at install | ISC |
| HTTP | hono | 4.13.13 | MIT |
| database | drizzle-orm, drizzle-kit over `bun:sqlite` and D1 | 0.45.4, 0.31.11 | Apache-2.0, MIT |
| validation | zod | 4.6.7 | MIT |
| engine | @comfyorg/sdk | 0.5.0 | MIT |
| agent | @earendil-works/pi-durable, @earendil-works/pi-ai | 1.3.0 | MIT |
| agent on Cloudflare | agents, `PiHarness` | 0.28.1 | MIT |
| MCP | @modelcontextprotocol/server, @modelcontextprotocol/hono | 2.3.1, 2.0.2 | Apache-2.0 |
| Cloudflare | wrangler, @cloudflare/vite-plugin, @cloudflare/workers-types | 4.151.1, 1.64.0, 5.20261016.1 | MIT, Apache-2.0 |

Refused because only pre-releases exist: Hono 5, Drizzle 1.0, @cloudflare/vite-plugin 2.0.

## Where it runs

| | On your machine | On Cloudflare |
|---|---|---|
| server | `Bun.serve` with the Hono app | the Hono app as a Worker |
| client | served by the server | Workers static assets |
| database | `bun:sqlite` file | D1 |
| assets | a folder on disk | R2 |
| run watcher | a timer over the runs table | a Durable Object alarm per run |
| agent | pi-durable over a SQLite file | `PiHarness` over the Durable Object's SQLite |
| agent's model | any OpenAI-compatible endpoint, per §The agent's model | Workers AI through the `AI` binding, or an OpenAI-compatible endpoint on the internet |
| engine | any target in §Engine targets | any target with an address on the internet. A ComfyUI on your own `127.0.0.1` is out of its reach |

D1 has no interactive transactions. Multi-row writes use `db.batch` on both runtimes.

The Workers Free plan allows 10ms of CPU per request. An agent turn can exceed it.

## Engine targets

Every target is an adapter of the one `GenerationEngine` port, per `docs/architecture.md` §The ports. The port's methods, `canRun`, `submit`, `read`, `listOutputs` and `cancel`, fit every target with no change.

| Target | Adapter | Base URL | Auth |
|---|---|---|---|
| Comfy Cloud | `ComfyGenerationEngine` | `https://cloud.comfy.org` | `Authorization: Bearer comfyui-...`. API access needs a paid plan |
| a Comfy deployment | `ComfyGenerationEngine` | `https://{deployment}.run.comfy.app` | the same Bearer key |
| your ComfyUI on your machine | `ComfyGenerationEngine`, through comfy-api-proxy | `http://127.0.0.1:8189` | none on loopback, or the proxy's `--token` |
| a RunPod pod | `ComfyGenerationEngine`, through comfy-api-proxy | `https://{POD_ID}-8189.proxy.runpod.net` | the proxy's `--token` |
| a Modal Server | `ComfyGenerationEngine`, through comfy-api-proxy | the address `modal.Server.get_url()` returns | `Authorization: Bearer wk-<id>.ws-<secret>`, a Modal Proxy Token |
| RunPod Serverless | `runpod-serverless-generation-engine.ts`, not written yet | `https://api.runpod.ai/v2/{endpoint_id}` | `Authorization: Bearer <RunPod key>`. A Restricted key can be limited to one endpoint |
| no engine | `DemoGenerationEngine` | none | none |

- No native ComfyUI adapter is written. ComfyUI v0.41.0, released 2026-10-15, serves no `/api/v2` route, checks no auth and reads no `Idempotency-Key`. comfy-api-proxy adds all three.
- RunPod's load balancing endpoints are not a target. A run's state lives in one worker, and nothing routes a status poll back to that worker.
- A target that reports no price shows "price unknown", never zero.
- No target has run live. No account was used.

### The Comfy API v2

`ComfyGenerationEngine` speaks this contract through `@comfyorg/sdk/low` 0.5.0. The spec is `https://docs.comfy.org/openapi-v2.yaml`.

| Step | Call |
|---|---|
| upload an input | `POST /api/v2/assets`. The workflow binds it as `{"__type":"core/ASSET","info":{"id":...}}` |
| submit | `POST /api/v2/jobs` with an `Idempotency-Key`. The body is the API file of a workflow, per `workflows/README.md` |
| status | `GET /api/v2/jobs/{id}`. States: `queued`, `running`, `succeeded`, `canceling`, `canceled`, `failed`, `expired` |
| output | `GET /api/v2/assets/{id}/content` |
| cancel | `POST /api/v2/jobs/{id}/cancel` |

- The API has no webhooks. Comfy Cloud also serves `GET /api/v2/jobs/{id}/events`, a Server-Sent Events stream that its docs call a live addition, not the source of truth. The run watcher polls and honours `Retry-After`.
- On Comfy Cloud, an output's content answers 302 to a signed URL that lasts about 6 hours. Comfy Cloud keeps a run's record readable until `expires_at`, 30 days after `created_at`, and its docs call that window a placeholder. Copy outputs to the asset store as soon as a run succeeds.
- A key on an inactive subscription gets 429. The adapter maps 429 and 503 to `EngineRateLimitedError`, so the watcher waits.
- The SDK's full client imports `node:` modules. On Workers use `@comfyorg/sdk/low`, and raw `fetch` against the spec if that fails.
- Comfy Cloud preinstalls models and a fixed set of custom node packs, and its docs describe no way to add another pack. Importing a model from Hugging Face or Civitai needs the Creator, Pro or Team plan. A workflow that needs another pack runs on a Comfy deployment or on a ComfyUI you run.
- A Comfy deployment runs a Build: a pinned ComfyUI version, models, custom node packs and dependencies, pushed with `comfy deploy`. Builds have no docs page. Their reference is the `comfy-build` skill in comfy-cli, and the platform can answer `build_not_enabled` while Builds are in limited beta. Models sit on read-only network storage in each region, billed per GB per month while any deployment of the Build exists. Each deployment uses one GPU type, and each worker gets a 50 GB disk. A run log exists only on a deployment.

### Your ComfyUI, through comfy-api-proxy

comfy-api-proxy 0.1.6, MIT, published on PyPI on 2026-08-19, serves the Comfy API v2 in front of a ComfyUI you run. It runs beside ComfyUI on your machine, in a RunPod pod or in a Modal Server.

```sh
pip install comfy-api-proxy
comfy-api-proxy --comfyui http://127.0.0.1:8188 --port 8189 --state-dir <dir>
```

- It maps the v2 routes onto ComfyUI's own routes and resolves `core/ASSET` references.
- It honours `Idempotency-Key`. The record survives a restart only with `--state-dir`.
- It serves `/api/v2/assets/{id}/content` from ComfyUI's `/view`, with no signed URL. The bytes stay in ComfyUI's `output/` folder. ComfyUI keeps its history in memory, so a restart loses it.
- It allows 8 event streams at once.
- With `--token`, it requires `Authorization: Bearer <token>`. It refuses to listen beyond loopback without `--token` or `--allow-insecure-bind`. Its origin check is on by default.
- With `--comfyui-base-dir`, `POST /api/v2/assets` can write a safetensors file into a model folder. It never installs custom nodes. Install those with ComfyUI-Manager or `comfy node install`, and models with `comfy model download`.

**On your machine.** Set `COMFY_BASE_URL=http://127.0.0.1:8189`. There is no platform fee.

**In a RunPod pod.** Run ComfyUI and the proxy with `--host 0.0.0.0 --token <token>`, and expose HTTP port 8189. The token is the target's key. RunPod's HTTP proxy adds no auth and closes a connection after 100 seconds with a 524 error. A poll fits inside that limit, and each output download must finish within it. A TCP port gives a public address that changes when the pod resets. Models and custom nodes go in the pod image and a network volume, with the same comfy-cli commands.

**In a Modal Server.** Run ComfyUI and the proxy under `@app.server()` with `--host 0.0.0.0 --allow-insecure-bind`. A Modal Server is private by default, and Modal's own proxy refuses every request without a Proxy Token. It answers 503 when no container runs, with no queue and no retry, and the watcher waits on that 503. One container holds the run history and the outputs. Set `min_containers=1`, or send every call of one run with the same `Modal-Routing-Affinity-Key`. Mount `output/` on a Volume if outputs must survive a scale-down. Modal removed its ComfyUI examples on 2026-03-05. The last one, `06_gpu_and_ml/comfyui/comfyapp.py` at modal-labs/modal-examples commit c7c0e3f, shows the image build with comfy-cli and the model download into a Volume. A Modal Web Function is not a target: it is public by default and caps an HTTP request at 150 seconds.

### RunPod Serverless

The adapter `runpod-serverless-generation-engine.ts`, not written yet, speaks RunPod's queue in front of `runpod-workers/worker-comfyui` 5.11.0, released 2026-09-21 at commit b7574c8. It sends the same API file from `workflows/` that Comfy runs.

| Step | Call |
|---|---|
| submit | `POST /run` with `{"input":{"workflow":<API file>,"images":[{"name":"<file>","image":"<base64>"}]},"policy":{"executionTimeout":<ms>,"ttl":<ms>}}` |
| status | `GET /status/{id}`. States: `IN_QUEUE`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `CANCELLED`, `TIMED_OUT` |
| output | `output.images[]` in the status, each `{filename,type,data}`, where `type` is `base64` or `s3_url` |
| cancel | `POST /cancel/{id}` |

- RunPod takes no idempotency key and no run id from the client. A `/run` sent again after its response was lost starts and bills a second run. So the adapter sends one `/run` per run with no retry, and stores the returned id before it does anything else. A run whose `/run` response is lost fails and is never sent again.
- The worker posts each entry of `images` to ComfyUI's `/upload/image`, and the workflow names the file. So an input binds as a file name, not as `core/ASSET`.
- `policy.executionTimeout` defaults to 10 minutes. The adapter always sends it.
- Results stay 30 minutes after a run completes. A payload is capped at 10 MB on `/run`, and RunPod says the cap covers results too. A video output needs the worker's bucket settings, `BUCKET_ENDPOINT_URL`, `BUCKET_ACCESS_KEY_ID` and `BUCKET_SECRET_ACCESS_KEY`, and then returns an `s3_url`.
- The worker reads only the `images` key of each output node. ComfyUI files a video from `SaveVideo` under `images`, so a video returns. Audio sits under `audio`, which the worker drops. Voice cannot return its output through this worker unchanged.
- Models and custom nodes go in a Dockerfile `FROM runpod/worker-comfyui:<version>-base`, with `comfy-node-install <nodes>` and `comfy model download --url ... --relative-path models/<folder>`. A network volume at `/runpod-volume/models/` can hold models, never nodes.
- A webhook is optional. The watcher polls.

### Keys and account connections

- The gateway reads one key or token per engine target in `env.ts`. A proxy on loopback may need none.
- The owner's key stays on the server, and every engine call goes through the Hono app. In public mode the visitor's key passes through the Hono app with each request and is never stored, per `docs/architecture.md` §Public mode.
- No target connects through OAuth. An account connection is added only where a provider documents one for the API Rosesfield calls.
  - Comfy documents OAuth only for its MCP server at `https://cloud.comfy.org/mcp`, and its v2 docs name only `Authorization: Bearer <api-key>`. Its OAuth metadata names `https://cloud.comfy.org/api` as a resource, but no doc says that `/api/v2/jobs` accepts such a token, and it was not tested.
  - RunPod documents OAuth only for its MCP server at `https://mcp.getrunpod.io/`. For `api.runpod.ai` it documents a scoped API key.
  - Modal's OAuth needs a client id that Modal issues, and it signs in the Modal SDK, not HTTP calls to a Modal Server. A Modal Server takes a Proxy Token.

`services/gateway/src/env.ts` picks one engine target from the settings, and `services/gateway/src/compose/pick-engines.ts` builds its adapter:

1. `RUNPOD_ENDPOINT_ID` selects RunPod Serverless, with `RUNPOD_API_KEY`.
2. `COMFY_BASE_URL` selects the Comfy target its host names, with `COMFY_API_KEY` when one is set. A comfy-api-proxy on loopback runs with no key.
3. `COMFY_API_KEY` alone selects Comfy Cloud. So does public mode with no `COMFY_BASE_URL`, and each visitor's key goes with each request.
4. No setting selects the demo engine.

The server refuses to start when `COMFY_BASE_URL` and `RUNPOD_ENDPOINT_ID` are both set.

### Prices

Read on 2026-10-17. Every paid target bills per second.

| Target | GPU rates per hour | Other costs |
|---|---|---|
| Comfy Cloud | H100 SXM 6.23 USD, RTX PRO 6000 4.54 USD, H200 7.71 USD, B200 11.23 USD, paid from credits at 211 credits per USD | plans of 20, 35, 100 and 700 USD per month: Standard, Creator, Pro and Team. They allow 1, 3, 5 and 25 API runs at once. A run lasts at most 30 minutes on Standard and Creator, and up to 1 hour on Pro |
| a Comfy deployment | not read | a flex worker bills from its start, model loading included, plus a 30 second idle window. A minimum worker bills all the time |
| your machine | none | none |
| a RunPod pod | H100 SXM 3.99 USD, RTX 4090 0.89 USD, L40S 1.09 USD, A100 80 GB SXM 1.79 USD, on Secure Cloud | it bills while the pod runs, idle time included. A network volume costs 0.07 USD per GB per month under 1 TB |
| a Modal Server | H100 3.95 USD, L40S 1.95 USD, A100 80 GB 2.50 USD | CPU and memory per second. A Volume costs 0.09 USD per GiB per month, with 1 TiB free. The Starter plan is 0 USD with 30 USD of credits each month |
| RunPod Serverless | H100 4.79 USD, A100 2.72 USD, L40S 1.75 USD, RTX 4090 1.10 USD, RTX 5090 1.58 USD | it bills from worker start to stop, cold start included. The idle timeout defaults to 5 seconds, and the default spend limit is 80 USD per hour |

## The Comfy Router

The Router runs closed partner models by id, so it stays out of the build. Rosesfield holds no Router adapter, the gateway composes none, and no app binds the Router.

## The voice model

Voice runs Chatterbox, by Resemble AI, through the node pack `filliptm/ComfyUI_Fill-ChatterBox`. It is the only open-weights speech pack that Comfy Cloud installs by default. The same pack runs the same node classes on your own ComfyUI, so one workflow in `workflows/` runs on both. The code and the weights are MIT, so you may use the outputs commercially.

Comfy publishes its own template for the pack, `audio-chatterbox_tts`: `LoadAudio`, then `FL_ChatterboxTTS`, then `SaveAudioMP3`, with a button to try it on Comfy Cloud. That template is the strongest public evidence that the pack runs on Comfy Cloud. It is not a run of ours.

### The pack

- Repository `https://github.com/filliptm/ComfyUI_Fill-ChatterBox`, pinned at commit `f7d7a16187430abcaf91a3039b9c83aa9960816a`, dated 2026-08-24. Its pyproject version is 1.0.5. The README says MIT, and the repository has no LICENSE file.
- The registry id is `comfyui_fill-chatterbox`. Its newest registry version, 1.0.4 from 2026-04-25, lacks the fixes from May to August, so the pin is the git commit.
- `FL_ChatterboxMultilingualTTS` runs Voice. It covers 23 languages and clones a voice from an optional AUDIO input.
- `FL_ChatterboxTTS` runs English. `FL_ChatterboxTurboTTS` runs English with tags such as `[laugh]`. The pack also holds `FL_ChatterboxDialogTTS` and `FL_ChatterboxVC`.
- Its pip packages are numpy, resampy, librosa, s3tokenizer, transformers, diffusers, omegaconf, conformer, safetensors and soundfile. With `resemble-perth` installed, every output carries Resemble's hidden watermark.
- Its README sets two limits: about 40 seconds of speech per run, and a reference recording of at least 5 to 6 seconds.

### The weights

The pack reads `models/chatterbox/<variant>/<file>` and downloads only the files that are missing. A Comfy Build downloads such files again after every cold start unless it declares them. So a Build declares every file of a variant, with the folder as its `type`, or none of them.

`models/chatterbox/chatterbox_multilingual/`, from `ResembleAI/chatterbox` at revision `5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18`:

| File | sha256 |
|---|---|
| `ve.pt` | `4b16d836bc598509860f6fa068165a8bb5e9ac84f05582dfcf278a5a372879f1` |
| `t3_mtl23ls_v2.safetensors` | `b1237586127ce98e7800a68e49938eb5092846862aabcb6e17b2fda7889a6c75` |
| `s3gen.pt` | `9b9ff07e60b20c136e2b1b3d7563a24604e8d2c4c267888d1ee929dd0151d2a3` |
| `conds.pt` | `6552d70568833628ba019c6b03459e77fe71ca197d5c560cef9411bee9d87f4e` |
| `grapheme_mtl_merged_expanded_v1.json` | stored without LFS, so no digest |
| `Cangjie5_TC.json` | stored without LFS, so no digest |

`models/chatterbox/chatterbox/`, from the same repository and revision:

| File | sha256 |
|---|---|
| `ve.safetensors` | `f0921cab452fa278bc25cd23ffd59d36f816d7dc5181dd1bef9751a7fb61f63c` |
| `t3_cfg.safetensors` | `914cb1696f47527fe8852ca8f1fe1fa63cb34f76f9c715e84e067b744dd0da81` |
| `s3gen.safetensors` | `2b78103c654207393955e4900aac14a12de8ef25f4b09424f1ef91941f161d4e` |
| `conds.pt` | `6552d70568833628ba019c6b03459e77fe71ca197d5c560cef9411bee9d87f4e` |
| `tokenizer.json` | stored without LFS, so no digest |

`models/chatterbox/chatterbox_turbo/`, from `ResembleAI/chatterbox-turbo` at revision `749d1c1a46eb10492095d68fbcf55691ccf137cd`:

| File | sha256 |
|---|---|
| `ve.safetensors` | `f0921cab452fa278bc25cd23ffd59d36f816d7dc5181dd1bef9751a7fb61f63c` |
| `t3_turbo_v1.safetensors` | `fcf1f8c1d651bb7e3acd69ee5be269b4ac10c02980b7708213d598bc9f7cdf87` |
| `s3gen_meanflow.safetensors` | `d65cb687a2ed581ee6cc297e919ffefa63386944f42364ae13b78a594945514f` |
| `conds.pt` | `b1852099306fd6a7814eb9d0bd10186caba7249596cc23868f78a0eefbfa5033` |

The turbo folder also holds `tokenizer_config.json`, `special_tokens_map.json`, `vocab.json`, `merges.txt` and `added_tokens.json`.

### Why Chatterbox, and what else was read

- It clones a voice from a recording, which fits Characters, and it covers Spanish and 21 other languages besides English.
- **Refused.** `ComfyUI-Qwen-TTS` by mailzwj, the other speech pack on Comfy Cloud. Its `QwenTTS.py` imports `dashscope` and reads a Bailian API key, so it calls Alibaba's closed API.

## The agent

pi, through `pi-durable`. It runs in process on bun and inside a Durable Object on Cloudflare, with no container. It brings no coding tools. Its tools are the catalog: each app definition becomes one tool. A tool that starts a paid run is marked `replay: "unsafe"` and sends the engine an idempotency key, so a resumed turn never pays twice.

The agent has 26 tools: one per app, 21 in all, and 5 library tools, `list_assets`, `read_asset`, `list_characters`, `read_character` and `read_run`. Each app tool starts a paid run. The model picks the app, fills its inputs, chains runs and reads results over many turns.

Catalog schemas are zod. pi tools take TypeBox. Bridge with `z.toJSONSchema()`, and test one tool end to end before generating all of them.

### The agent's model

The agent runs whatever `AGENT_BASE_URL`, `AGENT_MODEL` and `AGENT_API_KEY` name. On Workers AI alone, an unset `AGENT_MODEL` falls back to `@cf/zai-org/glm-5.3-flash`, per `services/gateway/src/agent/agent-env.ts`.

Open models work through the same three variables. GLM-5.3-Flash, MIT. Qwen3.8-27B, Apache-2.0, fits one 24 GB GPU.

For local development, an OpenAI-compatible proxy in front of your own subscription also works as `AGENT_BASE_URL`, with `/v1` at the end of the URL. It serves closed models.

#### Settings for each host

The agent reads `AGENT_BASE_URL`, `AGENT_MODEL` and `AGENT_API_KEY`. With no base URL, `AGENT_PROVIDER=cloudflare-workers-ai` selects Workers AI. It is the one pi-ai provider `packages/agent/src/infrastructure/pi-models.ts` registers, because its list holds only open-weights `@cf/` models. Any other provider id answers `AGENT_MODEL_UNKNOWN`, and every other host goes through `AGENT_BASE_URL`.

| Host | `AGENT_BASE_URL` | `AGENT_MODEL` | `AGENT_API_KEY` |
|---|---|---|---|
| Workers AI over HTTPS | `https://api.cloudflare.com/client/v4/accounts/<account-id>/ai/v1` | `@cf/zai-org/glm-5.3-flash` | a Cloudflare API token |
| RunPod | `https://api.runpod.ai/v2/<endpoint-id>/openai/v1` | `zai-org/GLM-5.3-Flash` | a RunPod API key |
| Modal | `https://<workspace>--<app>-server.<region>.modal.direct/v1` | the served model name | the vLLM `--api-key` value |
| Ollama | `http://127.0.0.1:11434/v1` | `qwen3.8:27b` | empty |
| LM Studio | `http://127.0.0.1:1234/v1` | the id LM Studio lists | empty |
| llama.cpp | `http://127.0.0.1:9931/v1` | the model it serves | the `--api-key` value, if the server has one |

- Workers AI can also run with no base URL: `AGENT_PROVIDER=cloudflare-workers-ai`. That path needs `CLOUDFLARE_ACCOUNT_ID` in the process environment, because `openPiModels` does not put it in the credential.
- On the Cloudflare runtime, Workers AI runs through the `AI` binding with no token: `createAI({ binding: env.AI })` from `agents/models/pi-ai`, then `models.setProvider(ai.provider)` and the model ref `{ provider: "cloudflare", modelId: "@cf/zai-org/glm-5.3-flash" }`. Only `@cf/` ids are used, because the other ids that provider lists are closed vendor models.
- The context window is fixed at 65,536 tokens, because pi-durable compacts against it. Every host serves at least that many. Ollama gives 4K tokens below 24 GiB of VRAM unless you set `OLLAMA_CONTEXT_LENGTH=65536`.

Workers AI, RunPod and Modal serve the published weights. The vLLM and Ollama paths above are the self-host paths.

## MCP

The server serves `/mcp` with the official SDK v2 and its Hono adapter, stateless. On Workers, `createMcpHandler` from `agents/mcp/server` is the documented fallback. Set the `nodejs_compat` flag. Requests carry the owner token, checked before the transport, per `docs/architecture.md` §The owner lock. On your machine, `localhostHostValidation()` guards against DNS rebinding.

## Platforms

One UI codebase, `apps/platform`, reaches every platform:

| Platform | How |
|---|---|
| web | the platform build, installable through vite-plugin-pwa |
| phone | installs from the browser through the same build |
| desktop | Electron around the platform build, in `apps/desktop` |
| iOS and Android stores | Capacitor around the platform build, in `apps/mobile` |

The shells' versions are read when they land. Until then, every device feature goes through the `Device` port, per `docs/architecture.md` §One codebase, every platform, so a shell adds an adapter and changes no screen. Runs keep going on the server when an app closes.

## Risks

1. Thirteen packages are under 7 days old. Pin them.
2. `PiHarness` is beta and was not run on Workers. Run Cloudflare's pi example. The fallback is pi-durable in our own Durable Object.
3. `@comfyorg/sdk` is 0.x and does not name bun or Workers. The fallback is raw `fetch`.
4. Apache-2.0 packages ask that their NOTICE files travel with a redistributed bundle.
5. No engine target, no voice run and no agent model has run live. Each one's first live run is its proof.
