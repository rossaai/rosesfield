# Stack

> The packages, versions and services Rosesfield runs on: the one engine, Comfy, reached through the Comfy Router and the Comfy API v2, the agent's harness and model, and MCP. Every npm version is the `latest` tag read on 2026-10-17. A version outside npm is named where it is used, with its source and date. Pre-releases are refused. Pin exact versions and commit `bun.lock`.

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
| fonts | Montserrat and JetBrains Mono, generated woff2 files in `apps/platform/public/fonts/` | listed in `generated.json` | OFL 1.1 |
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
| engine | Comfy, per §The one engine | Comfy, per §The one engine. A ComfyUI on your own `127.0.0.1` is out of its reach |

D1 has no interactive transactions. Multi-row writes use `db.batch` on both runtimes.

The Workers Free plan allows 10ms of CPU per request. An agent turn can exceed it.

## The one engine

Comfy runs every model. Two adapters of the one `GenerationEngine` port reach it with the same Comfy key, per `docs/architecture.md` §The ports, and `services/gateway/src/compose/pick-engines.ts` builds them:

| Adapter | What it runs | Address |
|---|---|---|
| `ComfyRouterGenerationEngine` | every hosted model in the Comfy Router catalog, per `docs/models.md` | `https://api.comfy.org` |
| `ComfyGenerationEngine` | the graphs in `workflows/`, through the Comfy API v2 | `https://cloud.comfy.org`, or `COMFY_BASE_URL` |
| `DemoGenerationEngine` | gray placeholders, marked Demo engine, when no key is set | none |

- A Comfy key starts with `comfyui-`. The Router runs only with such a key, so a proxy token reaches the graphs and never the Router.
- Every call has a timeout. Every submit carries an `Idempotency-Key`, so a submit sent again never pays twice. The run watcher polls and honours `Retry-After`.
- Each run's credits come from `GET https://api.comfy.org/customers/balance` before the submit and after the run ends, read by the credit meter in `packages/generation/src/infrastructure/credit-meter.ts`. A graph on Comfy Cloud with no balance reading is priced from its `execution_ms` at the GPU rate in §Prices.
- A price that is not known shows "price unknown", never zero.

### The Comfy Router

The Router runs hosted models by id on your Comfy key, with the routes of `https://docs.comfy.org/router-openapi.yaml`.

| Step | Call |
|---|---|
| the catalog | `GET /v2/models`, 100 a page |
| a model's form | `GET /v2/models/{provider}/{model}/openapi.json`, revalidated with `If-None-Match` |
| the price before a run | `POST /v2/models/{provider}/{model}/estimate`, then Comfy's published rate card when the estimate answers `403 not_enabled` |
| submit | the model's queued route with an `Idempotency-Key` |
| status and output | the queued request's status, then each output copied into the asset store before its link expires |

- A key the Router has not turned on answers `403 not_enabled`. The catalog's message names the fix and links Comfy's key page.
- Before a key connects, the catalog comes from Comfy's public schemas, listed in `https://docs.comfy.org/llms.txt`.

### The Comfy API v2

`ComfyGenerationEngine` speaks this contract through `@comfyorg/sdk/low` 0.5.0. The spec is `https://docs.comfy.org/openapi-v2.yaml`.

| Step | Call |
|---|---|
| upload an input | `POST /api/v2/assets`. The workflow binds it as `{"__type":"core/ASSET","info":{"id":...}}` |
| submit | `POST /api/v2/jobs` with an `Idempotency-Key`. The body is the API file of a workflow, per `workflows/README.md` |
| status | `GET /api/v2/jobs/{id}`. States: `queued`, `running`, `succeeded`, `canceling`, `canceled`, `failed`, `expired` |
| output | `GET /api/v2/assets/{id}/content` |
| cancel | `POST /api/v2/jobs/{id}/cancel` |

- The API has no webhooks. Comfy Cloud also serves `GET /api/v2/jobs/{id}/events`, a Server-Sent Events stream that its docs call a live addition, not the source of truth.
- On Comfy Cloud, an output's content answers 302 to a signed URL that lasts about 6 hours. Comfy Cloud keeps a run's record readable until `expires_at`, 30 days after `created_at`. Copy outputs to the asset store as soon as a run succeeds.
- A key on an inactive subscription gets 429. The adapter maps 429 and 503 to `EngineRateLimitedError`, so the watcher waits.
- The SDK's full client imports `node:` modules. On Workers use `@comfyorg/sdk/low`.
- Comfy Cloud preinstalls models and a fixed set of custom node packs, and its docs describe no way to add another pack. A workflow that needs another pack runs on your own ComfyUI.

### Your own ComfyUI, through comfy-api-proxy

ComfyUI serves no `/api/v2` route, checks no auth and reads no `Idempotency-Key`. comfy-api-proxy 0.1.6, MIT, published on PyPI on 2026-08-19, adds all three in front of a ComfyUI you run.

```sh
pip install comfy-api-proxy
comfy-api-proxy --comfyui http://127.0.0.1:8188 --port 8189 --state-dir <dir>
```

Then set `COMFY_BASE_URL=http://127.0.0.1:8189`. The graphs run on your ComfyUI, and the hosted models still run on the Router when `COMFY_API_KEY` holds a Comfy key.

- It honours `Idempotency-Key`. The record survives a restart only with `--state-dir`.
- It serves `/api/v2/assets/{id}/content` from ComfyUI's `/view`. ComfyUI keeps its history in memory, so a restart loses it.
- With `--token`, it requires `Authorization: Bearer <token>`, and `COMFY_API_KEY` holds the token. It refuses to listen beyond loopback without `--token` or `--allow-insecure-bind`.
- It never installs custom nodes or models. Load a workflow's UI file in ComfyUI, and it lists each missing model with a download button, per `workflows/README.md`.

### Prices

Read on 2026-10-17. Comfy Cloud bills a graph per second of GPU time: H100 SXM 6.23 USD, RTX PRO 6000 4.54 USD, H200 7.71 USD, B200 11.23 USD per hour, paid from credits at 211 credits per USD. Its plans cost 20, 35, 100 and 700 USD a month: Standard, Creator, Pro and Team. They allow 1, 3, 5 and 25 API runs at once. A run lasts at most 30 minutes on Standard and Creator, and up to 1 hour on Pro. A Router model bills its own rate from the same credits, per Comfy's rate card at `https://github.com/Comfy-Org/docs/blob/main/router-pricing/metronome-rates.json`.

## The voice model

Voice runs Chatterbox, by Resemble AI, through the node pack `filliptm/ComfyUI_Fill-ChatterBox`, pinned at commit `f7d7a16187430abcaf91a3039b9c83aa9960816a`. Comfy Cloud installs the pack, and the same pack runs the same node classes on your own ComfyUI, so one workflow in `workflows/` runs on both. The code and the weights are MIT. With `resemble-perth` installed, every output carries Resemble's hidden watermark. The pack's README sets two limits: about 40 seconds of speech per run, and a reference recording of at least 5 to 6 seconds.

## The agent

pi, through `pi-durable`. It runs in process on bun and inside a Durable Object on Cloudflare, with no container. It brings no coding tools. Its tools are the catalog: each app becomes one tool that takes the app's published form, and the library gives the rest. A tool that starts a paid run is marked `replay: "unsafe"` and sends the engine an idempotency key, so a resumed turn never pays twice.

Catalog schemas are zod. pi tools take TypeBox. Bridge with `z.toJSONSchema()`.

A value from `@earendil-works/pi-ai` is imported from the file that defines it, such as `@earendil-works/pi-ai/models` for `createModels`. A type may come from the package root. The package root is marked free of side effects, so the Worker bundle drops it, and a value read through the root is then undefined on Workers. `test/worker/worker-public.test.ts` catches it.

### The agent's model

The agent runs on a chat model of the Comfy Router, with your Comfy key. It has no setting of its own.

- Each model call is one `POST` to `https://api.comfy.org/v2/models/openrouter/chat-completions`, with no streaming. It carries your key in `X-API-Key`, an `Idempotency-Key` made from the request body, and a 120-second timeout, per `packages/agent/src/infrastructure/router-chat-fetch.ts`.
- Each answer is billed on its `usage.cost`, and the turn shows its credits.
- The agent starts when a Comfy key reaches Comfy Cloud: yours in Settings, or `COMFY_API_KEY`. With no Comfy key, or with `COMFY_BASE_URL` at another host, it is off, and every agent route answers `AGENT_MODEL_MISSING`.
- A key the Router has not turned on answers `403 not_enabled`. Agent shows the catalog's message, and the agent stays off.
- You choose the model in Agent, from the Router chat models in `packages/agent/src/infrastructure/router-chat-models.ts`.
- The context window is fixed at 65,536 tokens, because pi-durable compacts against it. An answer holds at most 8,192 tokens.
- `COMFY_API_KEY=<key> bun packages/agent/scripts/capture-scenario-answers.ts --model <id>` runs the agent's three scenarios live on one Router chat model and writes `packages/agent/test/fixtures/scenario-answers/<model>.json` as captured. Only the chat turns are live: each app run is answered by the same fakes the replay uses. It makes at most 12 Router calls, each with a 90-second timeout and no retry, drops every header that carries a key or a cookie, writes changing ids as `{{result:n}}` and `{{seen:n}}`, and prints each turn's `usage.cost` and the total. The scenario tests then replay the file and pick the default model.

## MCP

The server serves `/mcp` with the official SDK v2 and its Hono adapter, stateless. Set the `nodejs_compat` flag on Workers. Requests carry the owner token, checked before the transport, per `docs/architecture.md` §The owner lock. On your machine, `localhostHostValidation()` guards against DNS rebinding.

## Platforms

One UI codebase, `apps/platform`, ships as the web app, installable on a phone or a computer through vite-plugin-pwa. Every device feature goes through the `Device` port, per `docs/architecture.md` §One codebase, every platform, so a desktop or store shell adds an adapter and changes no screen. Runs keep going on the server when the app closes.

## Risks

1. Thirteen packages were under 7 days old when they were read. They are pinned.
2. `@comfyorg/sdk` is 0.x and does not name bun or Workers. The fallback is raw `fetch`.
3. Apache-2.0 packages ask that their NOTICE files travel with a redistributed bundle.
