import { describe, expect, it } from "vitest"
import { EndKeyLoopHandler } from "#application/end-key-loop/end-key-loop.handler"
import { DraftNotReadyError } from "#domain/error/draft-not-ready.error"
import {
  draftVideo,
  FakeEndKeyChain,
  FakeStepPricer,
  finalVideo,
  lastFrame,
  photo,
  restoredKey,
  steps,
} from "../fake/fake-end-key-chain"

const key = "motion-press-1"

function loopWith(chain: FakeEndKeyChain, prices = new FakeStepPricer({})) {
  return new EndKeyLoopHandler({ chain, prices })
}

async function draftOf(chain: FakeEndKeyChain) {
  return loopWith(chain).draft({ steps, key })
}

describe("the end-key loop", () => {
  it("runs the draft alone under its own key, finds its last frame and waits for a yes", async () => {
    const chain = new FakeEndKeyChain()
    const made = await draftOf(chain)
    expect(chain.started.map((one) => [one.appId, one.key])).toEqual([
      ["render-app", "motion-press-1-draft"],
    ])
    expect(chain.started[0]?.request.inputs.resolution).toBe("draft-size")
    expect(made.draft.outputs).toEqual([draftVideo, lastFrame])
    expect(made.frame).toBe(lastFrame)
    expect(made.awaits).toBe("yes")
  })

  it("starts nothing more until the answer is yes", async () => {
    const chain = new FakeEndKeyChain()
    const { draft } = await draftOf(chain)
    const loop = loopWith(chain)
    expect(await loop.final({ steps, key, draft, answer: "not-yet" })).toEqual({
      status: "waiting",
    })
    expect(chain.started).toHaveLength(1)
  })

  it("on a yes restores the draft's last frame with the photos, then renders the final with that end key and the draft's seed, each its own run", async () => {
    const chain = new FakeEndKeyChain()
    const { draft } = await draftOf(chain)
    const ended = await loopWith(chain).final({
      steps,
      key,
      draft,
      answer: "yes",
    })
    expect(chain.started.map((one) => [one.appId, one.key])).toEqual([
      ["render-app", "motion-press-1-draft"],
      ["edit-app", "motion-press-1-restore"],
      ["render-app", "motion-press-1-final"],
    ])
    expect(chain.started[1]?.request.inputs.images).toEqual([lastFrame, photo])
    expect(chain.started[2]?.request.inputs).toMatchObject({
      resolution: "final-size",
      endKey: [restoredKey],
      seed: draft.seed,
    })
    expect(ended.status).toBe("done")
    expect(ended.status === "done" ? ended.final.outputs : []).toEqual([
      finalVideo,
    ])
  })

  it("stops before the final when the restore fails, so no render is paid for a missing key", async () => {
    const chain = new FakeEndKeyChain({
      restore: { status: "failed", outputs: [restoredKey] },
    })
    const { draft } = await draftOf(chain)
    const ended = await loopWith(chain).final({
      steps,
      key,
      draft,
      answer: "yes",
    })
    expect(ended).toMatchObject({ status: "stopped", at: "restore" })
    expect(chain.started.map((one) => one.key)).toEqual([
      "motion-press-1-draft",
      "motion-press-1-restore",
    ])
  })

  it("refuses a final from a draft that failed or holds no last frame, and starts nothing", async () => {
    for (const ending of [
      { status: "failed" as const, outputs: [] },
      { status: "done" as const, outputs: [draftVideo] },
    ]) {
      const chain = new FakeEndKeyChain({ render: ending })
      const made = await draftOf(chain)
      expect(made.awaits).toBeNull()
      await expect(
        loopWith(chain).final({ steps, key, draft: made.draft, answer: "yes" })
      ).rejects.toBeInstanceOf(DraftNotReadyError)
      expect(chain.started).toHaveLength(1)
    }
  })
})

describe("the prices the loop shows", () => {
  const measured = {
    "draft-size": { source: "measured" as const, credits: 3.36 },
    restore: { source: "measured" as const, credits: 10.86 },
    "final-size": { source: "measured" as const, credits: 6.76 },
  }

  it("shows the draft's own price on Generate", async () => {
    const prices = new FakeStepPricer(measured)
    const loop = loopWith(new FakeEndKeyChain(), prices)
    expect(await loop.priceDraft(steps)).toEqual(measured["draft-size"])
    expect(prices.asked.map((one) => one.appId)).toEqual(["render-app"])
  })

  it("shows Make final as the restore and the final render together, read from the draft's own last frame", async () => {
    const chain = new FakeEndKeyChain()
    const { draft } = await draftOf(chain)
    const prices = new FakeStepPricer(measured)
    const price = await loopWith(chain, prices).priceFinal(steps, draft)
    expect(price.source).toBe("measured")
    expect(price.credits).toBeCloseTo(17.62, 6)
    expect(prices.asked.map((one) => one.appId).sort()).toEqual([
      "edit-app",
      "render-app",
    ])
    expect(
      prices.asked.find((one) => one.appId === "edit-app")?.inputs
    ).toEqual({ images: [lastFrame, photo] })
    expect(chain.started).toHaveLength(1)
  })

  it("names the sum an estimate when one part is an estimate, and unknown when one part is unknown", async () => {
    const chain = new FakeEndKeyChain()
    const { draft } = await draftOf(chain)
    const estimated = new FakeStepPricer({
      ...measured,
      restore: { source: "estimate", credits: 6 },
    })
    const sum = await loopWith(chain, estimated).priceFinal(steps, draft)
    expect(sum.source).toBe("estimate")
    expect(sum.credits).toBeCloseTo(12.76, 6)
    const unknown = new FakeStepPricer({ "final-size": measured["final-size"] })
    expect(await loopWith(chain, unknown).priceFinal(steps, draft)).toEqual({
      source: "unknown",
      credits: null,
    })
  })
})
