import { describe, expect, it } from "vitest"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { harnessFor, startImage } from "./harness"

describe("CancelRunHandler", () => {
  it("asks the engine to stop a submitted run and marks it cancelled", async () => {
    const engine = new FakeGenerationEngine({
      steps: [{ state: "running", progress: null, retryAfterSeconds: null }],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    await harness.advance.execute({ runId })
    harness.clock.advance(5000)
    const { run } = await harness.cancel.execute({ runId })
    expect(engine.cancelled).toEqual(["fake-1"])
    expect(run).toMatchObject({
      status: "cancelled",
      finishedAt: "2026-10-17T09:00:05.000Z",
    })
  })

  it("cancels a run the engine has not seen without calling it", async () => {
    const engine = new FakeGenerationEngine()
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    const { run } = await harness.cancel.execute({ runId })
    expect(run.status).toBe("cancelled")
    expect(engine.cancelled).toEqual([])
  })

  it("returns a finished run as it is", async () => {
    const harness = harnessFor()
    const runId = await startImage(harness)
    await harness.cancel.execute({ runId })
    const again = await harness.cancel.execute({ runId })
    expect(again.run.status).toBe("cancelled")
  })

  it("refuses a run that is not stored", async () => {
    await expect(
      harnessFor().cancel.execute({
        runId: "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f",
      })
    ).rejects.toMatchObject({ code: "RUN_NOT_FOUND", status: 404 })
  })
})
