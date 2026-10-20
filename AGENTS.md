# Rosesfield

Rosesfield is an open-source creative platform: one place to make images, video and sound with many apps that share one library, one set of characters and one history. It runs on Comfy first and stays engine-agnostic. This file is the index. Each rule lives in one doc under `docs/`, and this file only routes to it.

## What this project is

- Its tokens, typefaces, marks and component contracts are generated files, each listed in `generated.json`. Its rules are its own, one doc per subject under `docs/`.
- MIT for the code, the docs and the design tokens. The name and the logo are trademarks of ROSSA AI, LLC, and the logo files in `apps/platform/public/` are all rights reserved, per `TRADEMARKS.md`.
- You bring your own key and run it on your machine or your own host. No accounts, no payments, no credits.

## Hard lines

1. **Generated files stay generated.** The tokens, typefaces, marks and component contracts are the generated files `generated.json` lists, and none is edited by hand.
2. **The engine stays behind a port.** No engine name appears in `domain` or `application` code. Comfy is an adapter.
3. **Proof is real or absent.** No mock output, no invented timing, no placeholder demo in the README or the UI.
4. **A paid call carries a bound.** Every engine call has a timeout, a retry maximum and an idempotency key. An engine that takes no idempotency key gets one submit and no retry, per `docs/stack.md` §RunPod Serverless.
5. **A stranger never spends the owner's key.** Every request passes the owner lock, per `docs/architecture.md` §The owner lock. A hosted demo runs in public mode on each visitor's own key and holds no key of its own, per `docs/architecture.md` §Public mode.
6. **Nothing is held back.** Every app works fully with your own key.

## The folders

| Folder | What it holds |
|---|---|
| `apps/` | what ships to your device. `platform/` is the one UI codebase: React and Vite, the installable web app |
| `services/` | what runs on the server. `gateway/` is the one public server: Hono on bun and on Workers. Routes, the API, `/mcp`, the owner lock |
| `packages/` | code two consumers share: `kernel`, `contract`, `ui`, `catalog`, `generation`, `library` and `agent`, per `docs/architecture.md` §The shape |
| `workflows/` | every ComfyUI workflow, a UI file and an API file each, per `workflows/README.md` |
| `docs/` | one doc per subject, routed in §Doc routing |
| `scripts/` | the dependency-cruiser aliases, the checks the gate runs in `scripts/checks/`, such as the generated-file check and the typed-copy check, and `first-light`, which runs each workflow once against the engine you name, per `scripts/first-light/README.md` |

## Doc routing

| When the task touches | Read |
|---|---|
| what we build, the app list | `docs/product.md` |
| where code goes, contexts, ports, the catalog, jobs, the two runtimes | `docs/architecture.md` |
| any `.ts` or `.tsx` file: naming, TypeScript, the single contract law, the simplicity ladder, tests | `docs/standards.md` |
| any string a person reads, the README, a commit message, a report | `docs/voice.md` |
| any screen, component, token, motion or mark | `generated.json` and the generated files it lists, with `docs/product.md` §The screens |
| a package, a version, the Comfy API, an engine target, the agent harness, the agent's model, the voice model, deployment | `docs/stack.md` |
| a ComfyUI workflow, the `workflows/` folder and its format | `workflows/README.md` |

## Commands

Run every command from the repository root with bun 1.4.3. Node 22 or 24 must also be on the path, because Vite, dependency-cruiser and the DOM tests run on node.

| Command | What it does |
|---|---|
| `bun install` | Links every workspace from `bun.lock`. Every package is pinned to an exact version. |
| `bun run dev` | Runs the `dev` script of every app and service. Only the platform has one: Vite at `http://localhost:5173`. |
| `bun run build` | Builds the platform into `apps/platform/dist` and writes `apps/platform/src/route-tree.gen.ts`. `dev` writes it too. |
| `bun run typecheck` | Runs TypeScript 7 over `scripts/` and every workspace. |
| `bun run lint` | Runs Biome over every file git does not ignore, except `*.gen.ts`, then dependency-cruiser over the layer rules in `.dependency-cruiser.cjs`. |
| `bun run format` | Applies Biome's formatting and safe fixes. |
| `bun run test` | Runs `test:bun`, then `test:dom`. |
| `bun run test:bun` | Runs vitest on the bun runtime for every workspace except `ui` and `platform`. |
| `bun run test:dom` | Runs vitest on node with jsdom for `ui` and `platform`. |
| `bun run catalog:sync` | Writes `packages/catalog/src/apps.gen.ts` from the app folders. Each `<app-id>/app.ts` exports `app`. It refuses an `app.ts` without `copy.en.ts` and a name that is not a kebab-case id. |
| `bun run ui:add <component>` | Adds a shadcn component to `packages/ui/src/components`. Run `bun run format` after it. |
| `bun run generated:check` | Refuses a file listed in `generated.json` whose bytes differ from its sha256. Those files are generated, and none is edited by hand. |
| `bun run copy:check` | Refuses a string a person reads that is typed in a screen or a component instead of a generated copy file. Text inside `code`, `kbd`, `pre` or `samp`, a copy key, a class name and a test file pass. |
| `bun run gate` | Runs `catalog:sync`, `generated:check`, `copy:check`, `typecheck`, `lint` and `test`. It must pass before every commit. |

For one workspace: `bun run --filter @rosesfield/<workspace> typecheck` and `bun run --filter @rosesfield/<workspace> test`.

## Correction

When a mistake is found, the same change fixes the instance, adds the rule to the doc that owns it, and adds a lint rule or a test when a tool can decide it.
