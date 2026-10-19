import { describe, expect, it } from "vitest"
import { audioApp } from "../sample"
import { harnessFor, startImage } from "./harness"

describe("RepeatRunHandler", () => {
  it("starts a new run with the same inputs, count, format and seed", async () => {
    const harness = harnessFor()
    const runId = await startImage(harness, {
      inputs: { prompt: "a red door", model: "hosted" },
      count: 3,
      aspectRatio: "16:9",
    })
    const first = (await harness.get.execute({ runId })).run
    const { run } = await harness.repeat.execute({ runId })
    expect(run.id).not.toBe(runId)
    expect(run).toMatchObject({
      status: "queued",
      inputs: first.inputs,
      count: 3,
      aspectRatio: "16:9",
      seed: first.seed,
    })
    expect(harness.jobs.enqueued).toEqual([runId, run.id])
  })

  it("repeats a run of an app that takes no format", async () => {
    const harness = harnessFor({ apps: [audioApp()] })
    const started = await harness.start.execute({
      appId: "sample-audio",
      body: { inputs: { script: "hello" } },
      idempotencyKey: null,
      seed: null,
    })
    const { run } = await harness.repeat.execute({ runId: started.run.id })
    expect(run.aspectRatio).toBeNull()
    expect(run.inputs).toEqual({ script: "hello" })
  })

  it("refuses a run that is not stored", async () => {
    await expect(
      harnessFor().repeat.execute({
        runId: "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f",
      })
    ).rejects.toMatchObject({ code: "RUN_NOT_FOUND" })
  })
})
