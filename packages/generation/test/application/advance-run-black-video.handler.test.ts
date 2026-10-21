import {
  type AppDefinition,
  appDefinition,
  type Cost,
} from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import type { EngineOutput } from "#domain/generation-engine.port"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { imageApp } from "../sample"
import { stillsOf, videoBytesOf, videoOutput } from "../video-fixtures"
import { harnessFor, startImage } from "./harness"

const charged: Cost = { amount: 0.058516, currency: "USD" }

function videoApp(): AppDefinition {
  return appDefinition.parse({
    ...imageApp(),
    output: {
      kind: "video",
      count: { default: 1, max: 4 },
      aspectRatios: { options: ["1:1", "16:9"], default: "1:1" },
    },
  })
}

async function runOf(output: EngineOutput) {
  const engine = new FakeGenerationEngine({
    finished: { outputs: [output], cost: charged },
  })
  const harness = harnessFor({ apps: [videoApp()], engines: [engine] })
  const runId = await startImage(harness)
  await harness.advance.execute({ runId })
  const { run } = await harness.get.execute({ runId })
  return { run, kept: harness.assets.kept }
}

describe("AdvanceRunHandler with a black video", () => {
  it("fails a run whose only video has every sampled frame black, with its cost", async () => {
    const black = videoOutput(
      await videoBytesOf("melt-away-black"),
      await stillsOf("melt-away-black")
    )
    const { run, kept } = await runOf(black)
    expect(run).toMatchObject({
      status: "failed",
      failure: { code: "RUN_OUTPUT_BLANK" },
      cost: charged,
      outputs: [],
      dropped: 1,
    })
    expect(kept).toEqual([])
  })

  it("keeps a video whose sampled frames are lit, and keeps no still", async () => {
    const bytes = await videoBytesOf("test-pattern")
    const { run, kept } = await runOf(
      videoOutput(bytes, await stillsOf("test-pattern"))
    )
    expect(run).toMatchObject({ status: "done", cost: charged })
    expect(run.failure).toBeNull()
    expect(run.outputs).toHaveLength(1)
    expect(kept).toHaveLength(1)
    expect(kept[0]?.bytes).toEqual(bytes)
    expect(kept[0]).not.toHaveProperty("stills")
  })

  it("keeps a video that ends on a black frame", async () => {
    const [last] = (await stillsOf("melt-away-black")).slice(-1)
    const lit = (await stillsOf("test-pattern")).slice(0, -1)
    const stills = last === undefined ? lit : [...lit, last]
    const { run, kept } = await runOf(
      videoOutput(await videoBytesOf("test-pattern"), stills)
    )
    expect(stills).toHaveLength(5)
    expect(run).toMatchObject({ status: "done", failure: null })
    expect(kept).toHaveLength(1)
  })

  it("keeps a black video that came with no stills, such as a hosted model's", async () => {
    const { run, kept } = await runOf(
      videoOutput(await videoBytesOf("melt-away-black"))
    )
    expect(run).toMatchObject({ status: "done", failure: null })
    expect(kept).toHaveLength(1)
  })
})
