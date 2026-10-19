import type { RunId } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { EngineRateLimitedError } from "#domain/error/engine-rate-limited.error"
import { EngineUnavailableError } from "#domain/error/engine-unavailable.error"
import { RunInputRefusedError } from "#domain/error/run-input-refused.error"
import type { EngineOutput } from "#domain/generation-engine.port"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import {
  characterId,
  imageApp,
  pngBytes,
  portraitId,
  referenceId,
} from "../sample"
import { type Harness, harnessFor, startImage } from "./harness"

const image: EngineOutput = {
  kind: "image",
  mime: "image/png",
  bytes: pngBytes(),
  width: 2,
  height: 2,
  durationSeconds: null,
}

async function statusOf(harness: Harness, runId: RunId) {
  return (await harness.get.execute({ runId })).run
}

describe("AdvanceRunHandler", () => {
  it("submits, polls, keeps the outputs and stops when the run is done", async () => {
    const engine = new FakeGenerationEngine({
      steps: [
        { state: "running", progress: 0.5, retryAfterSeconds: 3 },
        { state: "succeeded" },
      ],
      outputs: [image, { ...image, kind: "video", mime: "video/mp4" }],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)

    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: 2000,
    })
    expect(engine.submitted[0]?.idempotencyKey).toBe(runId)
    expect((await statusOf(harness, runId)).engine.models).toEqual([
      "fake-model",
    ])

    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: 3000,
    })
    expect(await statusOf(harness, runId)).toMatchObject({
      status: "running",
      progress: 0.5,
    })

    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    const done = await statusOf(harness, runId)
    expect(done.status).toBe("done")
    expect(done.outputs).toHaveLength(1)
    expect(harness.assets.kept).toHaveLength(1)
    expect(harness.assets.kept[0]).toMatchObject({ runId, kind: "image" })
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
  })

  it("sends the bytes of each input and the references of a character", async () => {
    const engine = new FakeGenerationEngine()
    const harness = harnessFor({ engines: [engine] })
    for (const assetId of [referenceId, portraitId]) {
      harness.assets.addFile({
        assetId,
        kind: "image",
        mime: "image/png",
        bytes: pngBytes(),
      })
    }
    harness.assets.characters.set(characterId, [portraitId])
    const runId = await startImage(harness, {
      inputs: {
        prompt: "a red door",
        references: [referenceId],
        character: [characterId],
      },
    })
    await harness.advance.execute({ runId })
    const request = engine.submitted[0]
    expect(request?.inputs.character).toEqual([portraitId])
    expect(request?.files.map((file) => file.assetId)).toEqual([
      referenceId,
      portraitId,
    ])
    expect(request?.outputKind).toBe("image")
    expect(request?.seed).toBe((await statusOf(harness, runId)).seed)
  })

  it("fails the run with the error the engine reports", async () => {
    const engine = new FakeGenerationEngine({
      steps: [{ state: "failed", error: new RunInputRefusedError({}) }],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    await harness.advance.execute({ runId })
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    expect((await statusOf(harness, runId)).failure).toEqual({
      code: "RUN_INPUT_REFUSED",
      status: 400,
    })
  })

  it("marks the run cancelled when the engine stopped it", async () => {
    const engine = new FakeGenerationEngine({ steps: [{ state: "cancelled" }] })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    await harness.advance.execute({ runId })
    await harness.advance.execute({ runId })
    expect((await statusOf(harness, runId)).status).toBe("cancelled")
  })

  it("waits the engine's Retry-After, then fails after the retry maximum", async () => {
    const limited = () => new EngineRateLimitedError({ retryAfterSeconds: 30 })
    const engine = new FakeGenerationEngine({
      submitErrors: [limited(), limited(), limited()],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: 30_000,
    })
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: 30_000,
    })
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    expect((await statusOf(harness, runId)).failure?.code).toBe(
      "ENGINE_RATE_LIMITED"
    )
    expect(engine.submitted).toEqual([])
  })

  it("backs off when the engine does not answer a poll, then resets", async () => {
    const engine = new FakeGenerationEngine({
      steps: [
        new EngineUnavailableError({}),
        new EngineUnavailableError({}),
        { state: "running", progress: null, retryAfterSeconds: null },
      ],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    await harness.advance.execute({ runId })
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: 2000,
    })
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: 4000,
    })
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: 2000,
    })
    expect((await harness.runs.get(runId))?.attempts).toBe(0)
  })

  it("fails with RUN_FAILED on an error that is not the project's", async () => {
    const engine = new FakeGenerationEngine({ steps: [new TypeError("bad")] })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    await harness.advance.execute({ runId })
    await harness.advance.execute({ runId })
    expect((await statusOf(harness, runId)).failure?.code).toBe("RUN_FAILED")
  })

  it("fails a run that returned no output of the app's kind", async () => {
    const engine = new FakeGenerationEngine({
      outputs: [{ ...image, kind: "audio", mime: "audio/wav" }],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    await harness.advance.execute({ runId })
    await harness.advance.execute({ runId })
    expect((await statusOf(harness, runId)).failure?.code).toBe("RUN_FAILED")
    expect(harness.assets.kept).toEqual([])
  })

  it("stops a run past its time limit at the engine and fails it", async () => {
    const engine = new FakeGenerationEngine({
      steps: [{ state: "running", progress: null, retryAfterSeconds: null }],
    })
    const app = imageApp(undefined, { timeoutSeconds: 60, maxRetries: 2 })
    const harness = harnessFor({ apps: [app], engines: [engine] })
    const runId = await startImage(harness)
    await harness.advance.execute({ runId })
    harness.clock.advance(61_000)
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    expect(engine.cancelled).toEqual(["fake-1"])
    expect((await statusOf(harness, runId)).failure).toEqual({
      code: "RUN_TIMED_OUT",
      status: 502,
    })
  })

  it("keeps a stop that lands while it polls, and then stops watching", async () => {
    let harness: Harness | null = null
    let target: RunId | null = null
    const engine = new FakeGenerationEngine({
      steps: [{ state: "running", progress: 0.2, retryAfterSeconds: null }],
      onRead: async () => {
        if (harness !== null && target !== null) {
          await harness.cancel.execute({ runId: target })
        }
      },
    })
    harness = harnessFor({ engines: [engine] })
    target = await startImage(harness)
    await harness.advance.execute({ runId: target })
    expect(await harness.advance.execute({ runId: target })).toEqual({
      nextWakeMs: 2000,
    })
    expect((await statusOf(harness, target)).status).toBe("cancelled")
    expect(await harness.advance.execute({ runId: target })).toEqual({
      nextWakeMs: null,
    })
  })

  it("fails a run whose engine is not on this server", async () => {
    const harness = harnessFor()
    const runId = await startImage(harness)
    const other = harnessFor({
      engines: [new FakeGenerationEngine({ key: "another-engine" })],
    })
    const stored = await harness.runs.get(runId)
    if (stored === null) {
      throw new Error("the run was not stored")
    }
    await other.runs.add(stored)
    await other.advance.execute({ runId })
    expect((await statusOf(other, runId)).failure?.code).toBe(
      "ENGINE_UNAVAILABLE"
    )
  })

  it("leaves the run alone when a second submit with the same key loses the save", async () => {
    const engine = new FakeGenerationEngine({ refByKey: true })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    const results = await Promise.allSettled([
      harness.advance.execute({ runId }),
      harness.advance.execute({ runId }),
    ])
    expect(results.map((result) => result.status)).toEqual([
      "fulfilled",
      "fulfilled",
    ])
    expect(engine.submitted).toHaveLength(2)
    expect(engine.cancelled).toEqual([])
    expect((await statusOf(harness, runId)).status).toBe("queued")
  })
})
