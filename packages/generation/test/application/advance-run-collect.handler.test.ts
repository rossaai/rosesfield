import { describe, expect, it } from "vitest"
import { EngineUnavailableError } from "#domain/error/engine-unavailable.error"
import type { EngineOutput } from "#domain/generation-engine.port"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { imageApp, pngBytes } from "../sample"
import { type Harness, harnessFor, startImage } from "./harness"

const image: EngineOutput = {
  kind: "image",
  mime: "image/png",
  bytes: pngBytes(),
  width: 2,
  height: 2,
  durationSeconds: null,
}

const gone = () => new EngineUnavailableError({ cause: "download 503" })

function failStoreWrites(harness: Harness, times: number): void {
  const keep = harness.assets.keep.bind(harness.assets)
  let failures = times
  harness.assets.keep = async (output) => {
    if (failures > 0) {
      failures -= 1
      throw new Error("The asset store answered 502 to the write")
    }
    return keep(output)
  }
}

async function storeRun(failures: number) {
  const engine = new FakeGenerationEngine({ outputs: [image] })
  const harness = harnessFor({
    apps: [imageApp(undefined, { timeoutSeconds: 60, maxRetries: 2 })],
    engines: [engine],
  })
  failStoreWrites(harness, failures)
  const runId = await startImage(harness)
  await harness.advance.execute({ runId })
  return { harness, runId }
}

describe("AdvanceRunHandler collecting a finished run", () => {
  it("retries a failed download past the retry maximum and the time limit, then keeps the outputs", async () => {
    const engine = new FakeGenerationEngine({
      outputs: [image],
      outputErrors: [gone(), gone(), gone(), gone()],
    })
    const app = imageApp(undefined, { timeoutSeconds: 60, maxRetries: 2 })
    const harness = harnessFor({ apps: [app], engines: [engine] })
    const runId = await startImage(harness)
    await harness.advance.execute({ runId })
    for (let attempt = 0; attempt < 4; attempt += 1) {
      expect(await harness.advance.execute({ runId })).toEqual({
        nextWakeMs: 30_000,
      })
      harness.clock.advance(30_000)
      expect((await harness.get.execute({ runId })).run.status).toBe("running")
    }
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    const { run } = await harness.get.execute({ runId })
    expect(run.status).toBe("done")
    expect(run.outputs).toHaveLength(1)
    expect(engine.cancelled).toEqual([])
  })

  it("fails the run once Comfy no longer keeps the result", async () => {
    const engine = new FakeGenerationEngine({
      outputs: [image],
      outputErrors: [gone(), gone()],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    await harness.advance.execute({ runId })
    await harness.advance.execute({ runId })
    harness.clock.advance(86_400_001)
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    const { run } = await harness.get.execute({ runId })
    expect(run.failure?.code).toBe("RUN_FAILED")
  })

  it("keeps the outputs a synchronous run hands back at submit in the library at once", async () => {
    const engine = new FakeGenerationEngine({
      finished: {
        outputs: [image],
        cost: { amount: 0.01, currency: "USD" },
      },
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    const { run } = await harness.get.execute({ runId })
    expect(run).toMatchObject({
      status: "done",
      cost: { amount: 0.01, currency: "USD" },
    })
    expect(harness.assets.kept).toHaveLength(1)
    expect(engine.reads).toEqual([])
  })

  it("keeps a succeeded job collecting when the asset store refuses a write, then keeps its output", async () => {
    const { harness, runId } = await storeRun(1)
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: 30_000,
    })
    expect((await harness.get.execute({ runId })).run.status).toBe("running")
    harness.clock.advance(120_000)
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    const { run } = await harness.get.execute({ runId })
    expect(run.status).toBe("done")
    expect(run.outputs).toHaveLength(1)
    expect(harness.logged).toEqual([])
  })

  it("keeps the output of a succeeded job at once when the asset store answers", async () => {
    const { harness, runId } = await storeRun(0)
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    const { run } = await harness.get.execute({ runId })
    expect(run.status).toBe("done")
    expect(harness.assets.kept).toHaveLength(1)
  })

  it("fails the run past the retry maximum of store writes and logs the store's error with the run id", async () => {
    const { harness, runId } = await storeRun(3)
    await harness.advance.execute({ runId })
    await harness.advance.execute({ runId })
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    const { run } = await harness.get.execute({ runId })
    expect(run.failure?.code).toBe("RUN_FAILED")
    expect(harness.logged).toEqual([
      `Run ${runId} failed: Error: The asset store answered 502 to the write`,
    ])
  })
})
