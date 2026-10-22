# Waits

> The three waits Rosesfield adds on top of the model, how each one is measured on the demo engine, and the bound each one must stay inside. `apps/platform/e2e/waits.spec.ts` measures them, prints each one and fails when one passes its bound.

## The bounds

The spec reads its bounds from this table, so a bound changes here and nowhere else.

| Wait | From | To | Bound |
|---|---|---|---|
| `result` | the demo engine's done | the result painted | 1,000 ms |
| `video` | opening a video | its first frame on screen | 1,000 ms |
| `catalog` | opening an app | its model catalog on screen | 100 ms |

## The recipes

Each wait runs at the desktop width, 1440 by 900, in the Playwright project `desktop`, against the gateway on the demo engine that `apps/platform/playwright.config.ts` starts. A page reads its own clock once a frame, through `requestAnimationFrame`, so a reading is exact to one frame.

1. **`result`.** Open `/apps/image`, type a prompt and press Generate. The run's `createdAt` comes from the answer to `POST /api/apps/image/runs`. The demo engine is done `DemoGenerationEngine.delayMs` after it submits, so the engine's done is `createdAt` plus that delay, read from `packages/generation/src/infrastructure/demo-generation-engine.ts`. The result is painted on the first frame whose newest run holds an image that is complete and decoded. The wait is that frame's `Date.now()` less the engine's done. The gateway and the browser read the same machine's clock. The engine submits a few ms after `createdAt`, so the reading is a little longer than the true wait, never shorter.
2. **`video`.** Make one demo video through `POST /api/apps/video/runs` and wait for it to be done. Open `/history/<runId>` and wait for the network to rest. The wait starts at the `timeStamp` of the click on the video's tile and ends on the first frame where the viewer's `video` has `readyState` at `HAVE_CURRENT_DATA` or above.
3. **`catalog`.** Open `/apps/image` and wait for its model chip to show its model, so the app screen's code is loaded. Open the Video menu in the top bar and click Video. The wait starts at the `timeStamp` of that click and ends on the first frame where the path is `/apps/video` and the visible model chip shows a model name, not `Model` and not Image's model.

Run them from `apps/platform` with `bunx playwright test e2e/waits.spec.ts --project desktop`. Each test prints one line, `wait <id>: <ms> ms, bound <ms> ms`, and adds the same reading to its annotations.

## The control

Plant a 2,000 ms delay in the demo engine's done frame: in `packages/generation/src/infrastructure/demo-generation-engine.ts`, the engine reports `succeeded` once `elapsed` reaches `DemoGenerationEngine.delayMs + 2000` instead of `DemoGenerationEngine.delayMs`, in `read` and in each frame it yields for a watched run. The `result` wait then reads above 2,000 ms and the spec fails. Restore the line, and the spec passes again.

## The real providers

No agent runs a paid generation, so the waits are measured on the demo engine. The `result` and `video` waits on Comfy come from the owner's own runs, read from each run's timestamps.
