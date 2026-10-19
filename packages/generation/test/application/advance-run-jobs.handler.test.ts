import type { RunId } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { EngineUnavailableError } from "#domain/error/engine-unavailable.error"
import { RunInputRefusedError } from "#domain/error/run-input-refused.error"
import type { EngineOutput, EngineStatus } from "#domain/generation-engine.port"
import { Run } from "#domain/run"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { pngBytes } from "../sample"
import { type Harness, harnessFor, startImage } from "./harness"

const image: EngineOutput = {
  kind: "image",
  mime: "image/png",
  bytes: pngBytes(),
  width: 2,
  height: 2,
  durationSeconds: null,
}

const threeImages = {
  inputs: { prompt: "a red door in fog", seed: 2_147_483_646 },
  count: 3,
}

async function recordOf(harness: Harness, runId: RunId) {
  return (await harness.get.execute({ runId })).run
}

async function storedJobs(harness: Harness, runId: RunId) {
  return (await harness.runs.get(runId))?.jobs ?? []
}

describe("AdvanceRunHandler, one job per output", () => {
  it("submits one job per output with the seed plus its index", async () => {
    const engine = new FakeGenerationEngine({
      outputsPerJob: "one",
      outputs: [image],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness, threeImages)

    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: 2000,
    })
    expect(
      engine.submitted.map((request) => [
        request.idempotencyKey,
        request.seed,
        request.count,
      ])
    ).toEqual([
      [`${runId}-0`, 2_147_483_646, 1],
      [`${runId}-1`, 2_147_483_647, 1],
      [`${runId}-2`, 0, 1],
    ])
    expect((await storedJobs(harness, runId)).map((job) => job.ref)).toEqual([
      "fake-1",
      "fake-2",
      "fake-3",
    ])

    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    expect(engine.reads).toEqual(["fake-1", "fake-2", "fake-3"])
    const done = await recordOf(harness, runId)
    expect(done.status).toBe("done")
    expect(done.outputs).toHaveLength(3)
    expect(harness.assets.kept).toHaveLength(3)
  })

  it("keeps each job's outputs as it lands and polls only the others", async () => {
    const running: EngineStatus = {
      state: "running",
      progress: 0.5,
      retryAfterSeconds: 5,
    }
    const engine = new FakeGenerationEngine({
      outputsPerJob: "one",
      outputs: [image],
      stepsByRef: {
        "fake-1": [running, { state: "succeeded" }],
        "fake-2": [{ state: "succeeded" }],
        "fake-3": [running, running, { state: "succeeded" }],
      },
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness, threeImages)
    await harness.advance.execute({ runId })

    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: 5000,
    })
    expect(await recordOf(harness, runId)).toMatchObject({
      status: "running",
      progress: (0.5 + 1 + 0.5) / 3,
    })
    expect((await recordOf(harness, runId)).outputs).toHaveLength(1)

    await harness.advance.execute({ runId })
    expect(engine.reads.slice(3)).toEqual(["fake-1", "fake-3"])
    expect((await recordOf(harness, runId)).outputs).toHaveLength(2)

    await harness.advance.execute({ runId })
    expect(engine.reads.slice(5)).toEqual(["fake-3"])
    expect((await recordOf(harness, runId)).status).toBe("done")
  })

  it("stops the other jobs when one fails, and keeps what was made", async () => {
    const engine = new FakeGenerationEngine({
      outputsPerJob: "one",
      outputs: [image],
      stepsByRef: {
        "fake-1": [{ state: "succeeded" }],
        "fake-2": [{ state: "failed", error: new RunInputRefusedError({}) }],
        "fake-3": [
          { state: "queued", progress: null, retryAfterSeconds: null },
        ],
      },
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness, threeImages)
    await harness.advance.execute({ runId })

    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    expect(engine.cancelled).toEqual(["fake-3"])
    const failed = await recordOf(harness, runId)
    expect(failed.failure?.code).toBe("RUN_INPUT_REFUSED")
    expect(failed.outputs).toHaveLength(1)
  })

  it("cancels every job still working when the run is stopped", async () => {
    const engine = new FakeGenerationEngine({
      outputsPerJob: "one",
      steps: [{ state: "running", progress: null, retryAfterSeconds: null }],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness, threeImages)
    await harness.advance.execute({ runId })
    await harness.cancel.execute({ runId })
    expect(engine.cancelled).toEqual(["fake-1", "fake-2", "fake-3"])
    expect((await recordOf(harness, runId)).status).toBe("cancelled")
  })

  it("makes one job for a workflow that makes every output", async () => {
    const engine = new FakeGenerationEngine({ outputs: [image, image, image] })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness, threeImages)
    await harness.advance.execute({ runId })
    expect(engine.submitted.map((request) => request.count)).toEqual([3])
    expect(engine.submitted[0]?.idempotencyKey).toBe(runId)
  })
})

describe("AdvanceRunHandler, an engine that takes no idempotency key", () => {
  it("submits once and fails the run when the submit's answer is lost", async () => {
    const engine = new FakeGenerationEngine({
      idempotency: "none",
      submitErrors: [new EngineUnavailableError({})],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)

    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    expect((await recordOf(harness, runId)).failure?.code).toBe(
      "ENGINE_UNAVAILABLE"
    )
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    expect(engine.submitted).toEqual([])
  })

  it("marks the job before it submits and never sends it again", async () => {
    const engine = new FakeGenerationEngine({ idempotency: "none" })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    const run = await harness.runs.get(runId)
    if (run === null) {
      throw new Error("the run was not stored")
    }
    run.submitting(0)
    await harness.runs.save(run)

    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    expect(engine.submitted).toEqual([])
    expect((await recordOf(harness, runId)).failure?.code).toBe("RUN_FAILED")
  })

  it("stores the reference of a submit that answered", async () => {
    const engine = new FakeGenerationEngine({ idempotency: "none" })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    await harness.advance.execute({ runId })
    expect((await storedJobs(harness, runId))[0]).toMatchObject({
      status: "queued",
      ref: "fake-1",
    })
  })
})

describe("AdvanceRunHandler, a stored run with no job", () => {
  it("fails a stored run that holds no job instead of polling it", async () => {
    const engine = new FakeGenerationEngine()
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    const run = await harness.runs.get(runId)
    if (run === null) {
      throw new Error("the run was not stored")
    }
    await harness.runs.save(Run.restore({ ...run.toState(), jobs: [] }))
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    expect((await recordOf(harness, runId)).failure?.code).toBe("RUN_FAILED")
    expect(engine.submitted).toEqual([])
  })
})
