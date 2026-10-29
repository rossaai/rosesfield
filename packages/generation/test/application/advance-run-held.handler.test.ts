import type { Cost, EngineBinding } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import type { EngineOutput } from "#domain/generation-engine.port"
import { writeFlatPng } from "#infrastructure/demo/flat-png"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { harnessFor, startImage } from "./harness"

const charged: Cost = { amount: 0.03, currency: "USD" }

async function imageAt(nodeId: string, gray: number): Promise<EngineOutput> {
  return {
    nodeId,
    kind: "image",
    mime: "image/png",
    bytes: await writeFlatPng({ width: 32, height: 32, gray }),
    width: 32,
    height: 32,
    durationSeconds: null,
  }
}

class ResultNodesEngine extends FakeGenerationEngine {
  private readonly results: readonly string[] | null

  constructor(options: {
    outputs: EngineOutput[]
    results: readonly string[] | null
  }) {
    super({
      outputs: options.outputs,
      steps: [{ state: "succeeded", cost: charged }],
    })
    this.results = options.results
  }

  override resultNodesOf(_binding: EngineBinding): readonly string[] | null {
    return this.results
  }
}

async function finished(engine: FakeGenerationEngine) {
  const harness = harnessFor({ engines: [engine] })
  const runId = await startImage(harness)
  await harness.advance.execute({ runId })
  await harness.advance.execute({ runId })
  const { run } = await harness.get.execute({ runId })
  return { run, kept: harness.assets.kept }
}

describe("AdvanceRunHandler with the result nodes a binding names", () => {
  it("keeps the result node's output in the library and holds every other node's output out of it, by node", async () => {
    const result = await imageAt("68", 128)
    const frame = await imageAt("1011", 140)
    const { run, kept } = await finished(
      new ResultNodesEngine({ outputs: [result, frame], results: ["68"] })
    )
    expect(run.status).toBe("done")
    expect(run.outputs).toHaveLength(1)
    expect(run.held).toEqual([
      { nodeId: "1011", assetId: expect.any(String), kind: "image" },
    ])
    expect(run.outputs).not.toContain(run.held?.[0]?.assetId)
    expect(kept.map((one) => [one.place, one.bytes])).toEqual(
      expect.arrayContaining([
        ["library", result.bytes],
        ["held", frame.bytes],
      ])
    )
  })

  it("keeps every output in the library when the binding names no result node, the control", async () => {
    const { run, kept } = await finished(
      new ResultNodesEngine({
        outputs: [await imageAt("68", 128), await imageAt("1011", 140)],
        results: null,
      })
    )
    expect(run.outputs).toHaveLength(2)
    expect(run.held).toBeUndefined()
    expect(kept.every((one) => one.place === "library")).toBe(true)
  })

  it("ends a run whose binding names no result node done, with every output held and none in the library", async () => {
    const { run, kept } = await finished(
      new ResultNodesEngine({
        outputs: [await imageAt("13", 120), await imageAt("31", 130)],
        results: [],
      })
    )
    expect(run.status).toBe("done")
    expect(run.outputs).toEqual([])
    expect(run.held?.map((one) => one.nodeId)).toEqual(["13", "31"])
    expect(kept.every((one) => one.place === "held")).toBe(true)
  })

  it("holds every output of a run started held, even one no node saved, and lists the run nowhere", async () => {
    const plain = { ...(await imageAt("9", 128)) }
    delete plain.nodeId
    const harness = harnessFor({
      engines: [new ResultNodesEngine({ outputs: [plain], results: null })],
    })
    const runId = await startImage(harness, {
      inputs: { prompt: "a red door in fog" },
      place: "held",
    })
    await harness.advance.execute({ runId })
    await harness.advance.execute({ runId })
    const { run } = await harness.get.execute({ runId })
    expect(run).toMatchObject({ status: "done", place: "held", outputs: [] })
    expect(run.held).toEqual([
      { nodeId: "0", assetId: expect.any(String), kind: "image" },
    ])
    expect(harness.assets.kept.map((one) => one.place)).toEqual(["held"])
    const listed = await harness.list.execute({ appId: null, cursor: null })
    expect(listed.runs).toEqual([])
  })

  it("fails a run whose result is black even when it holds another output", async () => {
    const { run } = await finished(
      new ResultNodesEngine({
        outputs: [await imageAt("68", 0), await imageAt("1011", 140)],
        results: ["68"],
      })
    )
    expect(run).toMatchObject({
      status: "failed",
      failure: { code: "RUN_OUTPUT_BLANK" },
    })
  })
})
