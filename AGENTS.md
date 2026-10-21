# Rosesfield

Rosesfield is an open-source creative platform: one place to make images, video and sound with many apps that share one library, one set of characters and one history. Comfy runs every model, through one engine port. This file is the index. Each rule lives in one doc under `docs/`, and this file only routes to it.

## What this project is

- Its tokens, typefaces, marks, component contracts and copy are generated files, each listed in `generated.json`.
- MIT for the code, the docs and the design tokens. The name and the logo are trademarks of ROSSA AI, LLC, and the logo files in `apps/platform/public/` are all rights reserved, per `TRADEMARKS.md`.
- You bring your own Comfy key and run it on rosesfield.com, on your machine or on your own host. No accounts, no payments, no credits of its own.

## Hard lines

1. **Generated files stay generated.** The tokens, typefaces, marks, component contracts and copy are the generated files `generated.json` lists, and none is edited by hand.
2. **The engine stays behind a port.** No provider, lab or model name appears in `domain` or `application` code. An app declares its task, and its model list is the catalog Comfy publishes for that task, per `docs/models.md`.
3. **Proof is real or absent.** No mock output, no invented timing, no placeholder demo in the README or the UI.
4. **A paid call carries a bound.** Every engine call has a timeout, a retry maximum and an idempotency key, per `docs/stack.md` §The one engine.
5. **A stranger never spends the owner's key.** Every request passes the owner lock, per `docs/architecture.md` §The owner lock. A public host runs in public mode on each visitor's own key and holds no key of its own, per `docs/architecture.md` §Public mode.
6. **Nothing is held back.** Every app works fully with your own key.

## The folders

| Folder | What it holds |
|---|---|
| `apps/` | what ships to your device. `platform/` is the one UI codebase: React and Vite, the installable web app |
| `services/` | what runs on the server. `gateway/` is the one public server: Hono on bun and on Workers. Routes, the API, `/mcp`, the owner lock |
| `packages/` | code two consumers share: `kernel`, `contract`, `ui`, `catalog`, `generation`, `library` and `agent`, per `docs/architecture.md` §The shape |
| `workflows/` | every ComfyUI graph Rosesfield ships, a UI file and an API file each, per `workflows/README.md` |
| `docs/` | one doc per subject, routed in §Doc routing |
| `scripts/` | the dependency-cruiser aliases, the checks in `scripts/checks/`, and `deploy/`, which puts the platform on Cloudflare, per `docs/self-host.md` |

## Doc routing

| When the task touches | Read |
|---|---|
| where code goes, contexts, ports, a run, the two runtimes, the owner lock, public mode | `docs/architecture.md` |
| any `.ts` or `.tsx` file: naming, TypeScript, the single contract law, the simplicity ladder, tests | `docs/standards.md` |
| a package, a version, the Comfy Router, the Comfy API v2, the one engine, prices, the agent harness, the agent's model, MCP | `docs/stack.md` |
| how the model list is read from Comfy, the licence of each graph | `docs/models.md` |
| a public host: Cloudflare, its settings, the judge link | `docs/self-host.md` |
| a ComfyUI workflow, the `workflows/` folder and its format | `workflows/README.md` |
| any screen, component, token, motion, mark or string a person reads | `generated.json` and the generated files it lists |

## Commands

Run every command from the repository root with bun 1.4.3. Node 22 or 24 must also be on the path, because Vite, dependency-cruiser and the DOM tests run on node.

| Command | What it does |
|---|---|
| `bun install` | Links every workspace from `bun.lock`. Every package is pinned to an exact version. |
| `bun run start` | Builds the platform and starts the server at `http://127.0.0.1:8787`, which serves the platform and the API from one address. |
| `bun run dev` | Runs the `dev` script of every app and service: Vite at `http://localhost:5173` and the server on the demo engine. |
| `bun run build` | Builds the platform into `apps/platform/dist` and writes `apps/platform/src/route-tree.gen.ts`. `dev` writes it too. |
| `bun run typecheck` | Runs TypeScript 7 over `scripts/` and every workspace. |
| `bun run lint` | Runs Biome over every file git does not ignore, except `*.gen.ts`, then dependency-cruiser over the layer rules in `.dependency-cruiser.cjs`. |
| `bun run format` | Applies Biome's formatting and safe fixes. |
| `bun run test` | Runs `test:bun`, then `test:dom`. |
| `bun run test:bun` | Runs vitest on the bun runtime for every workspace except `ui` and `platform`. |
| `bun run test:dom` | Runs vitest on node with jsdom for `ui` and `platform`. |
| `bun run --filter @rosesfield/platform test:e2e` | Runs the platform's Playwright specs. |
| `bun run catalog:sync` | Writes `packages/catalog/src/apps.gen.ts` from the app folders and `packages/catalog/src/workflows.gen.ts` from `workflows/`. |
| `bun run ui:add <component>` | Adds a shadcn component to `packages/ui/src/components`. Run `bun run format` after it. |
| `bun run generated:check` | Refuses a file listed in `generated.json` whose bytes differ from its sha256. Those files are generated, and none is edited by hand. |
| `bun run copy:check` | Refuses a string a person reads that is typed in a screen or a component instead of a generated copy file. Text inside `code`, `kbd`, `pre` or `samp`, a copy key, a class name and a test file pass. |
| `bun run glob:check` | Refuses an `import.meta.glob` call that is not followed by `(`, such as a typed call, because Vitest caches the transform of such a file and a file added later stays out of its list, per `docs/standards.md` §TypeScript. |
| `bun run gate` | Runs `catalog:sync`, `generated:check`, `copy:check`, `glob:check`, `typecheck`, `lint` and `test`. It must pass before every commit. |
| `bun run deploy` | Puts the platform on Cloudflare in public mode, per `docs/self-host.md`. |

For one workspace: `bun run --filter @rosesfield/<workspace> typecheck` and `bun run --filter @rosesfield/<workspace> test`.

## Correction

When a mistake is found, the same change fixes the instance, adds the rule to the doc that owns it, and adds a lint rule or a test when a tool can decide it.
