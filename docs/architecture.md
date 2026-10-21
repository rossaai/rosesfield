# Architecture

> Rosesfield is one platform with many apps. The apps share one catalog, one library, one set of characters, one job runner and one engine port. An app is a row of data, not a program.

## The shape

```
apps/                     what ships to your device
  platform/               the one UI codebase: React and Vite, the installable web app
    src/studio/<app-id>/  an app's own screen, when the generic one is not enough
    src/gallery/          every component and screen in every state, for review
services/                 what runs on the server
  gateway/                the one public server: Hono on bun and on Workers. Routes, the API, /mcp, the owner lock
packages/                 code two consumers share
  kernel/                 ids, value objects, the error bases, Clock
  contract/               the zod schemas the gateway, platform, MCP and the agent share
  ui/                     shadcn components with our tokens, motion presets, the prompt bar, skeletons, state views
  catalog/                every app definition, its engine binding and its copy
    src/<app-id>/
      app.ts              id, inputs schema, output kind, engine binding, limits
      comfy/              the bindings from the app's inputs to the node ids of its workflow in workflows/
      copy.en.ts          every string the app shows
  generation/             runs, the engine port, its adapters, the run watcher
  library/                assets and characters: uploads, outputs, the people and things you reuse
  agent/                  the agent: the harness, its tools built from the catalog
workflows/                every ComfyUI graph Rosesfield ships, a UI file and an API file each, per workflows/README.md
docs/
```

`apps/` is what reaches your device. `services/` is what runs on a server. `packages/` is code two of them share. A folder name is a suggestion until the scaffold lands. The rules below are not.

## One codebase, every platform

`apps/platform` is the only UI code. The web app ships. A desktop or store shell wraps it later, without a second UI.

So nothing in `packages/` or in `apps/platform` may assume a browser where a shell does it differently. Picking a file, sharing, saving to the device and notifications sit behind a `Device` port. The web adapter lands first, and each shell adds its own.

## The catalog is the platform

One definition per app produces five things:

1. **The screen.** The platform renders a generic app screen from the definition: the inputs as fields, the output as the result area. An app that needs more gets its own screen at `apps/platform/src/studio/<app-id>/`, and still reads its inputs from the definition.
2. **The HTTP route.** `POST /api/apps/<app-id>/runs` validates the body against the app's schema and starts a job.
3. **The MCP tool.** The server's `/mcp` route lists one tool per app.
4. **The agent tool.** The agent calls the same definitions in process.
5. **The listing.** The home screen, search and the app index read the catalog.

Adding an app is adding a folder under `packages/catalog/src/`, and its workflow in `workflows/` when no workflow there fits. Nothing else in the tree should need to change. A change to an app that touches more than five files outside its folder means the design is wrong.

## Workflows

Every ComfyUI workflow lives in `workflows/` at the repository root. Each one is a UI file a person opens in ComfyUI and an API file the engine runs. The format is `workflows/README.md`.

- An app's `comfy/` folder imports the API file and holds the value bindings: which input goes to which node id and input name.
- Two apps that run the same graph import the same file.
- A graph is flat, with no subgraph, so a node id is the same in both files, in the bindings and in App Mode.
- Comfy Cloud and your own ComfyUI behind comfy-api-proxy run the same API file, per `docs/stack.md` §The one engine.

Until a graph moves, it sits in `packages/catalog/src/<app-id>/comfy/`.

## Contexts and layers

A context is one folder named by one singular noun: `generation`, `library`, `agent`. Inside it sit three layers.

- **domain** holds the nouns and their rules: entities, value objects, errors and ports. It imports nothing from npm, no `node:` module and no engine name.
- **application** holds one folder per use case: its input type, its handler and its output type. A handler receives ports in its constructor.
- **infrastructure** is the only layer that imports third-party code. Each file binds one technology to one port.
- **routes** parse input, call one handler and map errors. They hold no rule.

Imports point inward. dependency-cruiser enforces it.

## The ports

| Port | What it does | Adapters |
|---|---|---|
| `GenerationEngine` | submits a run, reads its status, lists its outputs, cancels it | `comfy-router-generation-engine.ts` for every hosted model of the Comfy Router. `comfy-generation-engine.ts` for the graphs in `workflows/` through the Comfy API v2, on Comfy Cloud or on a ComfyUI behind comfy-api-proxy. `demo-generation-engine.ts` with no key. Each one is in `docs/stack.md` §The one engine |
| `AssetStore` | puts, gets, deletes and links the bytes of an asset | `filesystem-asset-store.ts` on your machine, `r2-asset-store.ts` on Cloudflare |
| `JobRunner` | enqueues a job and wakes it until it ends | `timer-job-runner.ts` on your machine, `alarm-job-runner.ts` on Cloudflare |
| the repositories | store runs, assets, characters and conversations | drizzle over `bun:sqlite` on your machine and D1 on Cloudflare, one schema |
| `AgentHarness` | runs one turn of the agent with the catalog as its tools | the pi harness |
| `Clock` | gives the time | the system clock, a fixed clock in tests |
| `Device` | picks files, shares, saves to the device, notifies | the web adapter first, then one per shell |

A port names a capability. An adapter names its technology. A second adapter is written when a second engine or runtime needs it, never before.

## A run, end to end

1. The client posts the inputs to the app's route.
2. The route validates them against the app's schema and calls `StartRun`.
3. `StartRun` writes the run as `queued`, asks `GenerationEngine` to submit it with an idempotency key, and asks `JobRunner` to watch it.
4. The runner wakes, reads the remote status once, writes progress, and returns the next delay. It honours the engine's `Retry-After`.
5. When the run succeeds, the runner copies every output into `AssetStore` at once, because Comfy's output links expire: a signed link on Comfy Cloud lasts about 6 hours, and the run's record 30 days. The run becomes `done` with its assets. An output that is empty or black is dropped, and a run with no output left fails with `RUN_OUTPUT_BLANK`. The Comfy adapter adds five small stills, evenly spaced across the frames of each video it saves, to every graph it submits, saved under `rosesfield-stills/`. A video counts as black only when all five stills are black. The stills are never kept as outputs. A video with no stills, such as a hosted model's, is kept.
6. The client polls the run and shows the result where it was asked for.

A run made of several engine calls, such as Remake's plan turn and its shots, writes each step on the run as it ends: its ref, its cost, and the asset that holds its output. A run resumed after a restart reads its steps back, so no step is paid twice and no cost is lost.

The run states are `queued`, `running`, `done`, `failed` and `cancelled`, declared once in domain. The engine's own states map onto them in the adapter.

## Two runtimes, one gateway

The gateway is one Hono app. It runs on bun on your machine and as a Worker on Cloudflare. Only the composition root differs: it builds the adapters from the runtime's environment and hands them to the handlers. No handler reads the environment. One contract test suite runs against both sets of adapters, so the two runtimes cannot drift.

The gateway holds no state of its own. On Cloudflare, runs live in Durable Objects, rows in D1 and bytes in R2.

## The owner lock

Rosesfield has no accounts. It has one owner, and every paid call spends the owner's key.

- One middleware checks the owner token on every request: the routes, the API and `/mcp`.
- The token comes from the environment, read in `env.ts`.
- On your machine the server listens on `127.0.0.1` only, and the token is optional.
- A deployment that listens beyond your machine and has no token refuses to start, with an error that names the missing setting. Public mode is the one exception, per §Public mode.
- Cloudflare Access in front of a deployment is a valid second lock, never a replacement for the token.

## Public mode

A public host, such as rosesfield.com, runs in public mode. Strangers use it, so it holds no key of its own and spends none. Its settings are in `docs/self-host.md`.

- **Your Comfy key is the login.** You paste it in Settings. Rosesfield has no accounts and no passwords of its own.
- The gateway asks Comfy whose key it is, through `GET https://cloud.comfy.org/api/user`, and keeps your work under a sha256 hash of that Comfy account id. The same key on another device opens the same work, and a new key on the same Comfy account still opens it.
- The key stays in your browser and goes to the gateway with each request, in a header, never in a URL. The gateway hands it to the engine adapter for that one call and then drops it. It never writes the key to the database, a log, an error, a run record or the asset store.
- **Your work stays 30 days after your last visit.** Each visit moves the date. Once an hour the host deletes the runs, assets, characters and conversations of every account whose last visit is older, and every shared result older than 90 days.
- The run watcher reads the engine only inside a request, because only a request carries the key. A run moves forward while your page polls it.
- The agent follows the same rule: it runs on the key you bring, or it is off.
- The deployment refuses to start with `COMFY_API_KEY` or `OWNER_TOKEN` set, with an error that names the setting.
- The owner lock guards the owner's key. Public mode holds none, so it runs without an owner token.

## What the platform shares across apps

- **The library.** Everything you upload or make lives in one place. Any app can take any asset as an input.
- **Characters.** A character is a named set of reference images and settings. You make it once and use it in any app that takes a person or a subject.
- **The history.** Every run, with its inputs, its outputs, its seed and the model that made it, so a result can be made again.
- **The agent.** It can run any app, read the library and chain runs, through the same catalog.

These four are what make Rosesfield a platform and not a set of workflows.
