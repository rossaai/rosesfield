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
- Each run's credits come from `GET https://api.comfy.org/customers/balance` before the submit and after the run ends, read by the credit meter in `packages/generation/src/infrastructure/credit-meter.ts`. The meter measures a run only while it is the one run of its account in flight. A Router run it cannot measure, such as one of two Storyboard keyframes that run at once, takes the `X-Comfy-Credits-Used` header of its result: the synchronous route's answer, or the queued request's collect route. A graph on Comfy Cloud with no balance reading is priced from its `execution_ms` at the GPU rate in §Prices.
- A price that is not known shows no figure: Generate stands alone, never zero and never "Price unknown".
- One handler prices every run, `packages/generation/src/application/price-run/price-run.handler.ts`, from the first source that holds a price, and each price names its source in `from`:
  1. `measured`: the last run of the model at the same settings, on every engine, the demo engine too.
  2. `engine-estimate`: Comfy's estimate route, with a key that has it.
  3. `rate-card`: Comfy's published rate card, per `packages/generation/src/infrastructure/router/router-rates.ts`.
  4. `node-price`: the price the Comfy partner node that runs the same model publishes, read into `packages/generation/src/infrastructure/router/router-node-prices.gen.ts`.
  5. `model-runs`, for a graph: its nearest measured run, scaled by its outputs and its seconds.
  6. `task-runs`, for a graph with no run of its own: the median of the measured runs of the app's graphs that run the same task, scaled the same way.
- A quote never contradicts a measured run. When the source of a quote priced the model's nearest measured run more than 5 percent away from what it cost, the quote is scaled by that run's ratio and named an estimate.
- A price that is not a measured or published price for the exact settings is an estimate: a range, a converted token count, a node badge marked approximate, a scaled run or a median.
- The rate card converts every unit it reads to credits: per output, per second, per 5 seconds, per minute, per 30 output frames, per 1M output image tokens through the tokens each maker publishes for one image, and per Recraft credit through Recraft's price per image. A setting the card names that the run leaves unset with no default is read once per value it takes. A setting the card names by another word is read through the card's name for it. A row whose condition is free text is read when the model's rows agree. When the rows still disagree, the price is the range from the lowest to the highest.
- A range reaches the person as its low to its high, named an estimate. Its `credits` is the high end, so a spend limit reads the most a run can cost.
- A price that grows with the count is marked `perOutput`. Generate multiplies it on the client the moment the count changes, asks the server 100 ms after any change, and keeps the last price while the next one loads.

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

The tables that price what the card leaves out, each with its source and the day it was read:

| Table | Source | Read |
|---|---|---|
| output tokens per image, Gemini image models | `https://ai.google.dev/gemini-api/docs/pricing` | 2026-10-26 |
| output tokens per image, GPT Image 1 and 1.5 | `https://developers.openai.com/api/docs/guides/image-generation` | 2026-10-26 |
| Recraft credits per image | `https://www.recraft.ai/docs/api-reference/pricing` | 2026-10-26 |
| each partner node's price badge, `router-node-prices.gen.ts` | `comfy_api_nodes` of `https://github.com/Comfy-Org/ComfyUI`, pinned at the commit the file names | the date the file names |
| the agent's chat model prices, the `usdPer1M` of each model in `packages/agent/src/infrastructure/router-chat-models.json` | `https://openrouter.ai/api/v1/models` | the `readAt` of that source in the file |

`bun run prices:sync` writes the node table again and the chat models' prices in place, and names each model OpenRouter no longer lists. The node table evaluates each badge's JSONata expression with `jsonata` at build time over the settings the script lists for each model, so nothing is read at run time.

## The voice model

Voice runs Chatterbox, by Resemble AI, through the node pack `filliptm/ComfyUI_Fill-ChatterBox`, pinned at commit `f7d7a16187430abcaf91a3039b9c83aa9960816a`. Comfy Cloud installs the pack, and the same pack runs the same node classes on your own ComfyUI, so one workflow in `workflows/` runs on both. The code and the weights are MIT. With `resemble-perth` installed, every output carries Resemble's hidden watermark. The pack's README sets two limits: about 40 seconds of speech per run, and a reference recording of at least 5 to 6 seconds.

## The agent

pi, through `pi-durable`. It runs in process on bun and inside a Durable Object on Cloudflare, with no container. It brings no coding tools. Its tools are the catalog: each app becomes one tool that takes the app's published form, and the library gives the rest. A tool that starts a paid run is marked `replay: "unsafe"` and sends the engine an idempotency key, so a resumed turn never pays twice.

You choose the run mode in the agent's composer, and a new conversation opens on Auto. Manual, the wire value `ask`, proposes every run, and you accept or skip it. Auto, the wire value `auto`, prices each run with the same price the Generate button shows before it starts it. It starts the run only when the price comes from a measured run at the same settings, the engine's own estimate, the rate card or a partner node's price, read at the upper end of its range, and that end is at most one US dollar of Comfy credits, `autoRunLimitCredits` in `packages/catalog/src/comfy/comfy-credits.ts`. It proposes the run instead when the price is not known, when pricing fails, when the price is above that limit, or when the price is Rosesfield's own estimate from other runs, the `from` values `model-runs` and `task-runs`, because that estimate can sit below what Comfy bills. A Storyboard run is priced as the sum of every keyframe it makes, and one keyframe priced from other runs makes the Storyboard proposed. Pricing never starts a run, and a resumed turn reads the price it stored the first time.

Catalog schemas are zod. pi tools take TypeBox. Bridge with `z.toJSONSchema()`.

A value from `@earendil-works/pi-ai` is imported from the file that defines it, such as `@earendil-works/pi-ai/models` for `createModels`. A type may come from the package root. The package root is marked free of side effects, so the Worker bundle drops it, and a value read through the root is then undefined on Workers. `test/worker/worker-public.test.ts` catches it.

### The agent's model

The agent runs on a chat model of the Comfy Router, with your Comfy key. It has no setting of its own.

- Each model call is one `POST` to `https://api.comfy.org/v2/models/openrouter/chat-completions`, with no streaming. It carries your key in `X-API-Key`, an `Idempotency-Key` made from the request body, and a 120-second timeout, per `packages/agent/src/infrastructure/router-chat-fetch.ts`.
- Each answer is billed on its `usage.cost`, and the turn shows its credits.
- The model list is every chat model OpenRouter lists that can call tools, 274 read on 2026-10-26, in `packages/agent/src/infrastructure/router-chat-models.json`. Comfy's `openrouter/chat-completions` route forwards any OpenRouter model id unchanged. The file holds the rules that drop free variants, aliases, routers and models OpenRouter schedules for removal, the sources and the time each was read, and for each model its id, name, lab, context, inputs, OpenRouter's price per 1M tokens in and out, its score and rank, its efforts and OpenRouter's default effort for it. `packages/agent/test/infrastructure/router-chat-models.test.ts` refuses a model that cannot call tools.
- The models run in rank by intelligence: the mean over Artificial Analysis's Intelligence Index and Arena's text board, with style control, of each board's position score, and a model no board holds after the scored ones. A newer version of a model line never ranks below an older one. The rank shows on the lab's mark of each scored row.
- The agent opens on the highest ranked scored model whose price, 3 input to 1 output, is at or under the median of the listed models: `deepseek/deepseek-v4.1-flash-1017` on 2026-10-26. `defaultModelOf` in `router-chat-models.ts` applies the rule to the table, so a new read of the table names its own default.
- Best value marks a model with a point on the Pareto line of intelligence against cost per task across every model. A point is one effort of a model that Artificial Analysis publishes, with its cost per task of the Intelligence Index at OpenRouter's price.
- A row's caption holds what the model can do: its context, then the glyph of each input it takes. Text comes first on every model, because every model takes text, then each input the table lists, named Image, Video, Audio or Files, from OpenRouter's `architecture.input_modalities`. Text, image, video and audio use the library's glyph for that kind. The inputs show as glyphs alone, because a caption line holds the context and five input words only on a wide screen.
- A row ends with the model's Comfy credits per 1M tokens, at 211 per US dollar, blended 3 input to 1 output, as a whole number with the locale's thousands separator, such as 55, 844 or 1,688. A blend over 0 and under 1 shows as 1. Hovering it names the credits per 1M tokens in and out, as whole numbers by the same rule. `ratePriceOf` in `apps/platform/src/screens/app/hosted/agent-model-picker.tsx` holds the method. The price is the same at every effort.
- Each effort Effort lists names an estimate of one turn's credits at that effort: 1,650 input tokens and 400 output tokens, times the model's rates, with the output scaled by that effort's output tokens per task over the default model's at its opening effort, or at its first measured effort, where Artificial Analysis publishes both. `turnCreditsOf` in `packages/agent/src/infrastructure/router-chat-rates.ts` holds the method.
- The tokens of a typical turn are the median input and output tokens per turn, each turn summed over its model calls, across the 9 turns of `packages/agent/test/fixtures/scenario-answers/*.json`, read on 2026-10-26 and held as `typicalTurn` in `router-chat-rates.ts`. `packages/agent/test/infrastructure/router-chat-rates.test.ts` refuses medians the fixtures no longer give.
- Effort sits in the agent's composer beside the model, for a model that offers more than one reasoning effort. It lists the levels OpenRouter offers for the model and opens on OpenRouter's default effort for the model, `reasoning.default_effort` in its models list, when the model offers it, else on medium when offered, else on the middle level. `openEffortOf` in `router-chat-models.ts` applies the rule. Your choice is kept per model in this browser, so a model you change to opens on its own choice or its opening effort.
- The conversation keeps the effort its composer shows, sent on start and on each change like the run mode. Each turn sends it as OpenRouter's `reasoning: { effort }` in the body of the Router call: pi-ai's OpenRouter thinking format writes it from the conversation's thinking level, none as `none`. A turn whose model does not offer the conversation's effort sends the model's opening effort, and a model with no effort to choose sends no `reasoning`. `packages/agent/test/infrastructure/router-chat-effort.test.ts` reads the body of each call.
- The model list names the last three models you answered with, newest first: the model you use now, then each one you chose away from. A conversation stores no model, so this is the history of your choices, kept in the agent's settings.
- The agent starts when a Comfy key reaches Comfy Cloud: yours in Settings, or `COMFY_API_KEY`. With no Comfy key, or with `COMFY_BASE_URL` at another host, it is off, and every agent route answers `AGENT_MODEL_MISSING`.
- A key the Router has not turned on answers `403 not_enabled`. Agent shows the catalog's message, and the agent stays off.
- You choose the model in Agent, from the Router chat models of `packages/agent/src/infrastructure/router-chat-models.json`. A chosen model the table does not list is refused.
- The context window is fixed at 65,536 tokens, because pi-durable compacts against it. An answer holds at most 8,192 tokens.
- `COMFY_API_KEY=<key> bun packages/agent/scripts/capture-scenario-answers.ts --model <id>` runs the agent's three scenarios live on one Router chat model and writes `packages/agent/test/fixtures/scenario-answers/<model>.json` as captured. Only the chat turns are live: each app run is answered by the same fakes the replay uses. It makes at most 12 Router calls, each with a 90-second timeout and no retry, drops every header that carries a key or a cookie, writes changing ids as `{{result:n}}` and `{{seen:n}}`, and prints each turn's `usage.cost` and the total. The scenario tests then replay the file and find the cheapest model whose captured answers pass every scenario.

### The media the agent reads

`read_asset` returns the asset's facts: its kind, type, size, length and the run that made it with its inputs. When the conversation's model lists the asset's kind in its `inputs`, the model also receives the media itself, through the same `openrouter/chat-completions` route. The bounds are `routerMedia` in `packages/agent/src/infrastructure/router-chat-media.ts`, beside the fetch.

| Kind | What the model receives | Bound |
|---|---|---|
| image | pi-ai's image content, which its completions provider writes as an `image_url` part with a base64 data URL | at most 2000 pixels a side and 1.5 MiB of base64, so the tool result fits one 2 MB Durable Object row |
| audio | OpenRouter's `input_audio` part, `{ data, format }`, raw base64 with one of the formats OpenRouter lists: wav, mp3, aiff, aac, ogg, flac, m4a | 8 MiB and 300 seconds |
| video | OpenRouter's `video_url` part with a `data:video/<type>;base64,` URL, for mp4, mpeg, mov and webm | 8 MiB and 60 seconds |
| 3D model | its still picture, as an image, when the server stores one | the still is a preview of at most 64 KiB |

- OpenRouter's image page publishes no pixel or byte limit for chat completions: it says the number of images a request can carry "varies per provider and per model". The image bound comes from the Durable Object's 2 MB value limit and pi's 2000 pixel default. The audio and video seconds are the limits OpenRouter publishes for its one documented audio and video model, Clef Omni, and the bytes are the most one ranged read of the library returns, `ReadAssetContentHandler.maxRangeBytes`.
- An image within the bound is sent as it is. A larger one is scaled with Photon, through pi-durable's image processor, on bun only. On Workers, and when scaling fails, the model receives the library's preview of the image, and with no preview it receives the facts alone.
- pi-ai has no audio or video content, so the tool result carries a line `rosesfield-media:<asset id>`, and Rosesfield's router fetch replaces it before the request leaves. The fetch reads the asset through the request's own library, so a visitor's agent reads only that visitor's assets, and the media goes only with that visitor's key.
- A longer or larger WAV or MP3 sends its first part within the bound, and the tool result says how many seconds reach the model. Cutting any other audio, or any video, needs ffmpeg, which Workers cannot run, so such an asset is sent only when it already fits, and otherwise the model receives its facts and a note naming the bound.
- One turn sends at most 4 media and 16 MiB of them, in the order the turn read them. A later one is left out with a note. Media read in an earlier turn is not sent again, so the model reads an asset again to see it.
- Each read of the library's bytes has a 15-second timeout. No media and no key is logged.
- When the model does not take the asset's kind, the note names the three highest ranked models of the table that do. The agent's instructions say that media it reads adds to the cost of the turn.
- A 3D model's still is drawn only in the browser today, and the preview route accepts a picture only for an image or a video, so no still reaches the server. A still reaches the model once the platform uploads the picture `useMeshStill` paints through the preview route and `PutAssetPreviewHandler` accepts it for a 3D model.

## MCP

The server serves `/mcp` with the official SDK v2 and its Hono adapter, stateless. Set the `nodejs_compat` flag on Workers. Requests carry the owner token, checked before the transport, per `docs/architecture.md` §The owner lock. On your machine, `localhostHostValidation()` guards against DNS rebinding.

## Platforms

One UI codebase, `apps/platform`, ships as the web app, installable on a phone or a computer through vite-plugin-pwa. Every device feature goes through the `Device` port, per `docs/architecture.md` §One codebase, every platform, so a desktop or store shell adds an adapter and changes no screen. Runs keep going on the server when the app closes.

## Risks

1. Thirteen packages were under 7 days old when they were read. They are pinned.
2. `@comfyorg/sdk` is 0.x and does not name bun or Workers. The fallback is raw `fetch`.
3. Apache-2.0 packages ask that their NOTICE files travel with a redistributed bundle.
