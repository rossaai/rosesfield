import { run as runSchema } from "@rosesfield/contract"
import { appIdFormat, runIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { EngineNoCreditsError } from "#domain/error/engine-no-credits.error"
import { RunFinishedError } from "#domain/error/run-finished.error"
import { RunOutputBlankError } from "#domain/error/run-output-blank.error"
import type { OutputsPerJob } from "#domain/generation-engine.port"
import { Run } from "#domain/run"
import { portraitId, referenceId, start } from "../sample"

const later = new Date("2026-10-17T09:01:30.000Z")

function queued(
  outputsPerJob: OutputsPerJob = "all",
  seed: number | null = 42
): Run {
  return Run.queue({
    id: runIdFormat.parse("1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f"),
    appId: appIdFormat.parse("sample-image"),
    request: {
      inputs: { prompt: "a red door" },
      count: 2,
      aspectRatio: "16:9",
    },
    seed,
    adapter: "fake-engine",
    origin: "live",
    idempotencyKey: null,
    now: start,
    outputsPerJob,
  })
}

describe("Run", () => {
  it("starts queued with its request, its seed and no outputs", () => {
    const record = queued().toRecord()
    expect(runSchema.parse(record)).toEqual(record)
    expect(record).toMatchObject({
      status: "queued",
      count: 2,
      aspectRatio: "16:9",
      seed: 42,
      outputs: [],
      progress: null,
      engine: { adapter: "fake-engine", models: [], workflowHash: null },
      createdAt: "2026-10-17T09:00:00.000Z",
      finishedAt: null,
    })
  })

  it("plans one job for a workflow that makes every output", () => {
    expect(queued().jobs).toEqual([
      {
        index: 0,
        seed: 42,
        ref: null,
        status: "pending",
        progress: null,
        outputs: [],
      },
    ])
    expect(queued().idempotencyKeyOf(0)).toBe(queued().id)
  })

  it("plans one job per output, each with the seed plus its index", () => {
    const run = queued("one", 2_147_483_646)
    expect(run.jobs.map((job) => job.seed)).toEqual([
      2_147_483_646, 2_147_483_647,
    ])
    expect(run.idempotencyKeyOf(1)).toBe(`${run.id}-1`)
    expect(queued("one", null).jobs.map((job) => job.seed)).toEqual([
      null,
      null,
    ])
  })

  it("keeps the engine reference and models once submitted", () => {
    const run = queued()
    run.retried()
    run.submitted({
      index: 0,
      ref: "job-7",
      models: ["model-a"],
      workflowHash: "ab12",
    })
    expect(run.liveRefs()).toEqual(["job-7"])
    expect(run.jobs[0]?.status).toBe("queued")
    expect(run.attempts).toBe(0)
    expect(run.toRecord().engine).toEqual({
      adapter: "fake-engine",
      models: ["model-a"],
      workflowHash: "ab12",
    })
  })

  it("moves to running with the progress the engine reports", () => {
    const run = queued()
    run.observe({ index: 0, state: "running", progress: 0.42 })
    expect(run.status).toBe("running")
    expect(run.toRecord().progress).toBe(0.42)
  })

  it("shows the outputs of each job as it lands and ends when all have", () => {
    const run = queued("one")
    run.observe({ index: 0, state: "queued", progress: null })
    expect(run.toRecord()).toMatchObject({ status: "queued", progress: null })
    run.keepJob({ index: 1, outputs: [portraitId], now: later })
    expect(run.toRecord()).toMatchObject({
      status: "running",
      progress: 0.5,
      outputs: [portraitId],
      finishedAt: null,
    })
    run.keepJob({ index: 0, outputs: [referenceId], now: later })
    expect(run.toRecord()).toMatchObject({
      status: "done",
      progress: 1,
      outputs: [referenceId, portraitId],
      finishedAt: "2026-10-17T09:01:30.000Z",
    })
  })

  it("shows no total cost while one of its jobs has no known cost", () => {
    const run = queued("one")
    const each = { amount: 0.01, currency: "USD" as const }
    run.keepJob({ index: 0, outputs: [portraitId], cost: each, now: later })
    run.keepJob({ index: 1, outputs: [referenceId], cost: null, now: later })
    expect(run.toRecord()).toMatchObject({ status: "done", cost: null })
  })

  it("totals the cost of every job once each one is known", () => {
    const run = queued("one")
    const each = { amount: 0.01, currency: "USD" as const }
    run.keepJob({ index: 0, outputs: [portraitId], cost: each, now: later })
    expect(run.toRecord().cost).toBeNull()
    run.keepJob({ index: 1, outputs: [referenceId], cost: each, now: later })
    expect(run.toRecord().cost).toEqual({ amount: 0.02, currency: "USD" })
  })

  it("finishes done with its outputs, full progress and the end time", () => {
    const run = queued()
    run.keepJob({ index: 0, outputs: [portraitId], now: later })
    expect(run.toRecord()).toMatchObject({
      status: "done",
      outputs: [portraitId],
      progress: 1,
      finishedAt: "2026-10-17T09:01:30.000Z",
    })
    expect(run.isFinished()).toBe(true)
  })

  it("fails with its cost once every job kept nothing but dropped", () => {
    const run = queued("one")
    const each = { amount: 0.01, currency: "USD" as const }
    const whenEmpty = new RunOutputBlankError({ dropped: 1 })
    const dropped = { outputs: [], dropped: 1, cost: each, whenEmpty }
    run.keepJob({ ...dropped, index: 0, now: later })
    expect(run.toRecord()).toMatchObject({ status: "running", dropped: 1 })
    run.keepJob({ ...dropped, index: 1, now: later })
    expect(run.toRecord()).toMatchObject({
      status: "failed",
      failure: { code: "RUN_OUTPUT_BLANK", status: 502 },
      cost: { amount: 0.02, currency: "USD" },
      outputs: [],
      dropped: 2,
      finishedAt: "2026-10-17T09:01:30.000Z",
    })
  })

  it("finishes done on one job's outputs when another dropped all", () => {
    const run = queued("one")
    const whenEmpty = new RunOutputBlankError({ dropped: 1 })
    run.keepJob({ index: 0, outputs: [], dropped: 1, whenEmpty, now: later })
    run.keepJob({ index: 1, outputs: [portraitId], whenEmpty, now: later })
    expect(run.toRecord()).toMatchObject({
      status: "done",
      outputs: [portraitId],
      dropped: 1,
      failure: null,
    })
  })

  it("names no dropped output when no job dropped one", () => {
    const run = queued()
    run.keepJob({ index: 0, outputs: [portraitId], dropped: 0, now: later })
    expect(run.toRecord()).not.toHaveProperty("dropped")
    expect(run.jobs[0]).not.toHaveProperty("dropped")
  })

  it("fails with the code and status of the error and no message", () => {
    const run = queued()
    run.fail({ error: new EngineNoCreditsError({}), now: later })
    expect(run.toRecord().failure).toEqual({
      code: "ENGINE_NO_CREDITS",
      status: 502,
    })
    expect(run.status).toBe("failed")
  })

  it.each([
    (run: Run) => run.observe({ index: 0, state: "running", progress: null }),
    (run: Run) =>
      run.submitted({ index: 0, ref: "x", models: [], workflowHash: null }),
    (run: Run) => run.keepJob({ index: 0, outputs: [], now: later }),
    (run: Run) => run.submitting({ index: 0, now: later }),
    (run: Run) => run.retried(),
  ])("refuses a step after it was cancelled", (step) => {
    const run = queued()
    run.cancel({ now: later })
    expect(() => step(run)).toThrow(RunFinishedError)
    expect(run.status).toBe("cancelled")
  })

  it("hands out copies, so a caller cannot change its state", () => {
    const run = queued()
    run.toRecord().outputs.push(portraitId)
    run.toState().record.status = "done"
    expect(run.toRecord().outputs).toEqual([])
    expect(run.status).toBe("queued")
  })

  it("restores the state it gave out, at another version", () => {
    const run = queued()
    const restored = Run.restore(run.toState()).withVersion(3)
    expect(restored.version).toBe(3)
    expect(restored.toRecord()).toEqual(run.toRecord())
  })
})
