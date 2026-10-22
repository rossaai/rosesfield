import type { Run as RunRecord } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import type { EngineOutput, Pause } from "#domain/generation-engine.port"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { FakePriceBook } from "../fake/fake-price-book"
import { pngBytes } from "../sample"
import { harnessFor, startImage } from "./harness"

const image: EngineOutput = {
  kind: "image",
  mime: "image/png",
  bytes: pngBytes(),
  width: 2,
  height: 2,
  durationSeconds: null,
}

const charged = { amount: 1 / 211, currency: "USD" } as const

function gate(): { held: Promise<void>; release: () => void } {
  let release: () => void = () => undefined
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  return { held, release }
}

function meteredEngine(onRead: () => Promise<void> = async () => undefined) {
  return new FakeGenerationEngine({
    outputs: [image],
    creditsPerUsd: 211,
    steps: [{ state: "succeeded" }, { state: "succeeded", cost: charged }],
    onRead,
  })
}

describe("AdvanceRunHandler, a cost read after the result", () => {
  it("marks the run done with its price not known, then writes the cost the engine reads after", async () => {
    const late = gate()
    const engine = meteredEngine(async () => {
      if (engine.reads.length === 2) {
        await late.held
      }
    })
    const prices = new FakePriceBook()
    const harness = harnessFor({ engines: [engine], prices })
    const runId = await startImage(harness)
    await harness.advance.execute({ runId })

    expect(await harness.advance.execute({ runId })).toEqual({
      nextWakeMs: null,
    })
    const shown = (await harness.get.execute({ runId })).run
    expect(shown.status).toBe("done")
    expect(shown.outputs).toHaveLength(1)
    expect(shown.cost).toBeNull()
    expect(prices.kept).toEqual([])

    late.release()
    await harness.advance.priced(runId)
    const priced = (await harness.get.execute({ runId })).run
    expect(priced.status).toBe("done")
    expect(priced.cost).toEqual(charged)
    expect(prices.kept.map((one) => one.cost)).toEqual([charged])
    expect(engine.reads).toEqual(["fake-1", "fake-1"])
  })

  it("keeps the price not known when the read after finds no cost", async () => {
    const engine = new FakeGenerationEngine({
      outputs: [image],
      creditsPerUsd: 211,
      steps: [{ state: "succeeded" }],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    await harness.advance.execute({ runId })
    await harness.advance.execute({ runId })
    await harness.advance.priced(runId)

    const { run } = await harness.get.execute({ runId })
    expect(run.status).toBe("done")
    expect(run.cost).toBeNull()
  })

  it("reads no cost after the result from an engine that counts no credits", async () => {
    const engine = new FakeGenerationEngine({ outputs: [image] })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    await harness.advance.execute({ runId })
    await harness.advance.execute({ runId })
    await harness.advance.priced(runId)

    expect(engine.reads).toEqual(["fake-1"])
  })

  it("sends the done frame first and the priced frame once the cost is read", async () => {
    const engine = new FakeGenerationEngine({
      outputs: [image],
      creditsPerUsd: 211,
      watches: [
        [
          { state: "running", progress: 0.5, retryAfterSeconds: null },
          { state: "succeeded" },
        ],
      ],
      steps: [{ state: "succeeded", cost: charged }],
    })
    const harness = harnessFor({ engines: [engine] })
    const runId = await startImage(harness)
    const pause: Pause = async (ms) => {
      harness.clock.advance(ms)
    }

    const frames: RunRecord[] = []
    for await (const frame of harness.advance.watch({
      runId,
      signal: new AbortController().signal,
      pause,
    })) {
      frames.push(frame.run)
    }

    const ended = frames.filter((run) => run.status === "done")
    expect(ended.map((run) => run.cost)).toEqual([null, charged])
    expect(frames.at(-1)?.outputs).toHaveLength(1)
  })
})
