# Standards

> The rules every `.ts` and `.tsx` file follows. A rule a tool can decide lives in the tool. Everything else is the reviewer's to check.

## Before you write code: the simplicity ladder

Read the nearest existing code and trace the real flow first. Then stop at the first rung that holds.

1. **Does it need to exist?** A port, option or abstraction nobody calls is speculation. Skip it.
2. **Is it already in this repository?** Look in the shared packages and in the finished apps.
3. **Does the standard library or the web platform do it?** `fetch`, `URL`, `AbortSignal.timeout`, `crypto.randomUUID`, `structuredClone`, `Intl`.
4. **Does the engine do it?** A Comfy node or a published workflow comes before TypeScript. Resizing an input image is a node in the workflow, not a new image library on the server.
5. **Does an installed dependency do it?** Use it. A new dependency for a few lines is refused.
6. **Is it one line?** Write the line.
7. **Does open source solve the rest?** Read its source first. Check that its licence fits MIT before copying any code. ComfyUI is GPL-3.0: we call it over HTTP and never copy its source.
8. **Only then** write the least new code that closes the gap.

The ladder shortens code, never the safeguards. Input validation, timeouts, error handling that keeps a person's work, and secret handling always stay.

## The single contract law

One concept has one contract. Before you write a type, a schema or an abstraction, find the one that exists and read who uses it.

- Reuse it when the meaning is the same.
- Extend it when the new need belongs to the same concept, and keep its users working.
- Write a second one only when the meaning, the guarantees, the owner or the lifecycle differ.

Examples:
- Every app starts a run with the same `StartRunInput`. The video apps add no `VideoJobRequest`. Clip length is an input in the app's schema.
- A wire type comes from its zod schema: `type StartRunBody = z.infer<typeof startRunBody>`. No hand-written twin.
- An image and a video are one `Asset` with a `kind`. A `Recipe`, the app's template, and a `Run`, one execution of it, stay two concepts because their lifecycles differ.

## Layers and ports

See `docs/architecture.md` §Contexts and layers. In short: domain imports nothing external, application imports its domain, infrastructure binds technology, routes call one handler. No engine name in domain or application, in identifiers or strings. Engine outputs are `unknown` until a schema parses them, and engine failures become project errors.

## Errors

A small closed set of bases, each with one HTTP status, mapped in one file.

| Base | Meaning | Status |
|---|---|---|
| `InvalidArgumentError` | the input breaks a rule | 400 |
| `NotFoundError` | the thing is not stored | 404 |
| `ConflictError` | the state changed under the request | 409 |
| `PreconditionFailedError` | the current state forbids the step | 412 |
| `RateLimitedError` | too many requests | 429 |
| `DependencyError` | the engine, the store or the network failed | 502 |

Every concrete error extends one base and carries a stable `code`, such as `RUN_NOT_FOUND`. The client maps the code to words. No empty `catch`. Absence is `null`.

## Naming

- kebab-case for folders, files, packages and routes. camelCase for values and functions. PascalCase for classes and components. SCREAMING_SNAKE for error codes.
- Functions are verbs. Predicates start with `is`, `has` or `can`.
- A file is named after what it exports, then its role: `start-run.handler.ts` exports `StartRunHandler`.
- Allowed role suffixes: `.value-object.ts`, `.id.ts`, `.error.ts`, `.port.ts`, `.repository.ts`, `.handler.ts`, `.test.ts`, `.contract.ts`. A fake is `fake-<port>.ts`.
- Refused suffixes: `.service.ts`, `.util.ts`, `.utils.ts`, `.helper.ts`, `.manager.ts`, `.dto.ts`, `.interface.ts`, `.types.ts`, `.model.ts`. Each one hides the role.
- An adapter carries no suffix. Its technology prefix states its role: `comfy-generation-engine.ts`.
- Named exports only, except where a framework requires a default. No `export *`. Path aliases, no deep relative imports.

## TypeScript

- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `verbatimModuleSyntax` from the first commit.
- No `any`. `unknown` only at a boundary. No `as` casts. No non-null `!` outside tests.
- `type` for shapes, `class` for behaviour. No `interface`, no `enum`. A closed set is a string union.
- A stored yes or no fact is a named status: `visibility: "private" | "shared"`, not `isShared`.
- Explicit return types on exports. No floating promises. Independent awaits run through `Promise.all`.
- A file past 400 lines or a function past 50 lines is split before it lands. A constructor takes one options object.
- A constant lives on the class that owns it. No `constants.ts`.
- The environment is read in one typed `env.ts` that validates at startup and names the missing variable. Code never branches on the environment.
- Time comes from an injected `Clock`. No `Date.now()` in domain or application.
- No machine paths in tracked files. They come from config.
- An `import.meta.glob` call takes no type argument. Vitest caches the transform of every file whose text lacks `import.meta.glob(`, so a typed call keeps the list it read first, and a file added later stays out of it in tests. The query types a `?url` or `?raw` result as a string. Any other result is `unknown` and is checked before use.

## Comments

No `TODO`, no commented-out code, no comment that restates the code. One doc line on an exported port method is allowed, because outside contributors read the ports first.

## Packages

A package exists when two apps import it or when it is published. Code one app uses stays in that app. A package names a capability, never a consumer.

## Tests

- `src/` holds production code only. `test/` mirrors it.
- A fake is a class that extends its port. No `vi.mock`.
- One contract test per port runs against every adapter and the fake. It is what proves Rosesfield engine-agnostic.
- Comfy HTTP in tests is replayed from recorded responses. The replay helper throws on any request it has no recording for.
- Time in tests comes from a fixed clock. No real sleep.
- Every new test has a control: break the code it covers, watch it fail, restore it, and name the break in the commit body.
- Refused: a constant asserted equal to itself, an export asserted to be a function, a fake tested against itself, an assertion that passes when its element is missing, a mock that answers `200 {}` to everything.

## The gate

`typecheck`, `lint` and `test` run before every commit and stay under one minute. One end-to-end test per app calls its route against replayed Comfy responses. Live runs against a real Comfy are the build's proof, outside the gate. Main stays green.

## What a tool holds

| Rule | Tool |
|---|---|
| layer direction, no npm import in domain | dependency-cruiser |
| no `any`, no `interface`, no `enum`, size limits, no floating promises | Biome |
| strict compiler flags | `tsconfig.base.json` |
| an `import.meta.glob` call with a type argument | `bun run glob:check` |
| env validated at start | zod in `env.ts` |
| everything else | a reviewer |
