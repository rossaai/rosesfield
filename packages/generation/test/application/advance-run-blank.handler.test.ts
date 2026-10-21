import type { Cost } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import type { EngineOutput } from "#domain/generation-engine.port"
import { writeFlatPng } from "#infrastructure/demo/flat-png"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { harnessFor, startImage } from "./harness"

const charged: Cost = { amount: 0.03, currency: "USD" }

async function imageOf(gray: number): Promise<EngineOutput> {
  return {
    kind: "image",
    mime: "image/png",
    bytes: await writeFlatPng({ width: 32, height: 32, gray }),
    width: 32,
    height: 32,
    durationSeconds: null,
  }
}

class OutputsByRefEngine extends FakeGenerationEngine {
  private readonly byRef: Record<string, EngineOutput[]>

  constructor(byRef: Record<string, EngineOutput[]>) {
    super({
      outputsPerJob: "one",
      steps: [{ state: "succeeded", cost: charged }],
    })
    this.byRef = byRef
  }

  override async listOutputs(ref: string): Promise<EngineOutput[]> {
    return this.byRef[ref] ?? []
  }
}

const twoImages = { inputs: { prompt: "a red door in fog" }, count: 2 }

describe("AdvanceRunHandler with black outputs", () => {
  it("fails a run whose every output is black, with its cost", async () => {
    const engine = new FakeGenerationEngine({
      outputs: [await imageOf(0), await imageOf(0)],
      steps: [{ state: "succeeded", cost: charged }],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    await harness.advance.execute({ runId })
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    const { run } = await harness.get.execute({ runId })
    expect(run).toMatchObject({
      status: "failed",
      failure: { code: "RUN_OUTPUT_BLANK", status: 502 },
      cost: charged,
      outputs: [],
      dropped: 2,
    })
    expect(run.finishedAt).not.toBeNull()
    expect(harness.assets.kept).toEqual([])
  })

  it("keeps the good outputs, drops the black one and says so", async () => {
    const good = await imageOf(128)
    const engine = new FakeGenerationEngine({
      outputs: [await imageOf(0), good],
      steps: [{ state: "succeeded", cost: charged }],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    await harness.advance.execute({ runId })
    await harness.advance.execute({ runId })
    const { run } = await harness.get.execute({ runId })
    expect(run).toMatchObject({ status: "done", cost: charged, dropped: 1 })
    expect(run.outputs).toHaveLength(1)
    expect(harness.assets.kept.map((one) => one.bytes)).toEqual([good.bytes])
    expect(run.failure).toBeNull()
  })

  it("names no dropped output when every output is good", async () => {
    const engine = new FakeGenerationEngine({ outputs: [await imageOf(128)] })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    await harness.advance.execute({ runId })
    await harness.advance.execute({ runId })
    const { run } = await harness.get.execute({ runId })
    expect(run.status).toBe("done")
    expect(run).not.toHaveProperty("dropped")
  })

  it("fails a run handed back black at submit, with its cost", async () => {
    const engine = new FakeGenerationEngine({
      finished: { outputs: [await imageOf(0)], cost: charged },
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    const { run } = await harness.get.execute({ runId })
    expect(run).toMatchObject({
      status: "failed",
      failure: { code: "RUN_OUTPUT_BLANK" },
      cost: charged,
      dropped: 1,
    })
  })

  it("finishes a run of jobs on its good job", async () => {
    const engine = new OutputsByRefEngine({
      "fake-1": [await imageOf(0)],
      "fake-2": [await imageOf(128)],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness, twoImages)
    await harness.advance.execute({ runId })
    await harness.advance.execute({ runId })
    const { run } = await harness.get.execute({ runId })
    expect(run).toMatchObject({
      status: "done",
      dropped: 1,
      cost: { amount: 0.06, currency: "USD" },
    })
    expect(run.outputs).toHaveLength(1)
  })

  it("fails a run of jobs once every job came back black", async () => {
    const engine = new OutputsByRefEngine({
      "fake-1": [await imageOf(0)],
      "fake-2": [await imageOf(0)],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness, twoImages)
    await harness.advance.execute({ runId })
    await harness.advance.execute({ runId })
    const { run } = await harness.get.execute({ runId })
    expect(run).toMatchObject({
      status: "failed",
      failure: { code: "RUN_OUTPUT_BLANK" },
      dropped: 2,
      cost: { amount: 0.06, currency: "USD" },
    })
    const stored = await harness.runs.get(runId)
    expect(stored?.jobs.map((job) => job.dropped)).toEqual([1, 1])
  })
})
