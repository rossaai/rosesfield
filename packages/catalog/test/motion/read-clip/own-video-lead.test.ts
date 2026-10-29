import {
  type AppDefinition,
  type HeldOutput,
  type Run,
  startRunBody,
  startRunBodyFor,
} from "@rosesfield/contract"
import {
  type ChainRun,
  EndKeyLoopHandler,
  RunChain,
  type StepRun,
} from "@rosesfield/generation/bindings"
import {
  type AssetId,
  appIdFormat,
  assetIdFormat,
  runIdFormat,
} from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { app as imageApp } from "#image/app"
import { readApps } from "#list-apps"
import { planClip } from "#motion/clip-plan"
import { type OwnVideoAsk, OwnVideoLead } from "#motion/comfy/own-video-lead"
import { motion } from "../motion-replay"
import { twoTargetPlan } from "./clip-plan-answers"

function idOf(n: number): AssetId {
  return assetIdFormat.parse(`${n}f3a4b5c-6d7e-4f8a-9b0c-1d2e3f4a5b6c`)
}

const clip = idOf(1)
const frames = [idOf(2), idOf(3), idOf(4), idOf(5)]
const photos = [idOf(6), idOf(7), idOf(8)]
const kept = idOf(9)
const made = {
  depth: assetIdFormat.parse("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"),
  mask: assetIdFormat.parse("b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e"),
  firstFrame: assetIdFormat.parse("c3d4e5f6-a7b8-4c9d-8e0f-2a3b4c5d6e7f"),
  edited: assetIdFormat.parse("d4e5f6a7-b8c9-4d0e-9f1a-3b4c5d6e7f8a"),
  draft: assetIdFormat.parse("e5f6a7b8-c9d0-4e1f-8a2b-4c5d6e7f8a9b"),
  lastFrame: assetIdFormat.parse("f6a7b8c9-d0e1-4f2a-9b3c-5d6e7f8a9b0c"),
  endKey: assetIdFormat.parse("a7b8c9d0-e1f2-4a3b-8c4d-6e7f8a9b0c1d"),
}

const ask: OwnVideoAsk = {
  clip,
  frames,
  photos,
  sentence: " replace the man, not the woman ",
  frameSize: { width: 720, height: 1280 },
  aspectRatio: "9:16",
  resolution: "1080p",
  seed: 41,
}

const keptPlan = planClip(twoTargetPlan, 3)

const heldOf: Readonly<Record<string, HeldOutput[]>> = {
  plan: [{ nodeId: "0", assetId: kept, kind: "text" }],
  read: [
    { nodeId: "31", assetId: made.firstFrame, kind: "image" },
    { nodeId: "13", assetId: made.depth, kind: "video" },
    { nodeId: "28", assetId: made.mask, kind: "video" },
  ],
  edit: [{ nodeId: "0", assetId: made.edited, kind: "image" }],
  draft: [{ nodeId: "1011", assetId: made.lastFrame, kind: "image" }],
  restore: [{ nodeId: "0", assetId: made.endKey, kind: "image" }],
}

type Started = { appId: string; request: ChainRun; key: string }

class StageChain extends RunChain {
  readonly started: Started[] = []

  async start(app: string, request: ChainRun, key: string): Promise<Run> {
    this.started.push({ appId: app, request, key })
    const stage = key.slice(key.lastIndexOf("-") + 1)
    return {
      id: runIdFormat.parse(
        `${this.started.length}a0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d`
      ),
      appId: appIdFormat.parse(app),
      status: "done",
      inputs: request.inputs,
      count: 1,
      aspectRatio: request.aspectRatio,
      seed: 41,
      outputs: stage === "draft" || stage === "final" ? [made.draft] : [],
      held: heldOf[stage] ?? [],
      progress: null,
      engine: { adapter: "demo", models: [], workflowHash: null },
      cost: null,
      origin: "demo",
      failure: null,
      createdAt: "2026-10-29T10:00:00.000Z",
      finishedAt: "2026-10-29T10:01:00.000Z",
    }
  }

  async settle(run: Run): Promise<Run> {
    return run
  }
}

function image(): AppDefinition {
  const [parsed] = readApps([{ folder: "image", app: imageApp }])
  if (parsed === undefined) {
    throw new Error("The image app did not parse")
  }
  return parsed
}

function accepts(app: AppDefinition, step: Pick<StepRun, "request">): boolean {
  const { inputs, aspectRatio, place } = step.request
  const body = {
    inputs,
    ...(aspectRatio === null ? {} : { aspectRatio }),
    ...(place === undefined ? {} : { place }),
  }
  return (
    startRunBodyFor(app).safeParse(body).success &&
    startRunBody.safeParse(body).success
  )
}

function leadOf(): { lead: OwnVideoLead; read: AssetId[] } {
  const read: AssetId[] = []
  const lead = new OwnVideoLead({
    ask,
    heldText: async (assetId) => {
      read.push(assetId)
      return JSON.stringify(keptPlan)
    },
  })
  return { lead, read }
}

const loopOf = (chain: RunChain) =>
  new EndKeyLoopHandler({
    chain,
    prices: {
      execute: async () => ({ price: { source: "unknown", credits: null } }),
    },
  })

describe("your own video's lead before the draft", () => {
  it("plans with your video, its 4 frames, your photos and your prompt, held, then reads the clip with the plan's targets, then edits the first frame with your photos, each held under its own key", async () => {
    const chain = new StageChain()
    const { lead, read } = leadOf()
    const led = await loopOf(chain).lead({ lead, key: "press-3" })
    expect(led.status).toBe("led")
    expect(chain.started.map((one) => [one.appId, one.key])).toEqual([
      ["motion", "press-3-plan"],
      ["motion", "press-3-read"],
      ["image", "press-3-edit"],
    ])
    const [plan, clipRead, edit] = chain.started
    expect(plan?.request).toMatchObject({
      inputs: {
        model: "motion-plan",
        clip: [clip],
        frames,
        photo: photos,
        scene: "replace the man, not the woman",
      },
      place: "held",
    })
    expect(read).toEqual([kept])
    expect(clipRead?.request).toMatchObject({
      inputs: {
        model: "motion-read-clip",
        clip: [clip],
        targets: "the man in the grey coat, the bottle in his right hand",
      },
      place: "held",
    })
    expect(edit?.request.place).toBe("held")
    expect(JSON.stringify(edit?.request.inputs)).toContain(made.firstFrame)
    expect(lead.plan?.unusedPhotos).toEqual([1])
    expect(
      accepts(motion, plan ?? { request: { inputs: {}, aspectRatio: null } })
    ).toBe(true)
    expect(
      accepts(
        motion,
        clipRead ?? { request: { inputs: {}, aspectRatio: null } }
      )
    ).toBe(true)
    expect(
      accepts(image(), edit ?? { request: { inputs: {}, aspectRatio: null } })
    ).toBe(true)
  })

  it("then runs the same end-key chain an example runs: the 480p draft from the read and the edit, the restore with your photos, and the final at your resolution with the draft's seed, and reads the clip and the plan only once", async () => {
    const chain = new StageChain()
    const { lead, read } = leadOf()
    const loop = loopOf(chain)
    const key = "press-4"
    const led = await loop.lead({ lead, key })
    if (led.status !== "led") {
      throw new Error(`the lead ended ${led.status}`)
    }
    const drafted = await loop.draft({ steps: led.steps, key })
    expect(drafted.frame).toBe(made.lastFrame)
    const draftStep = chain.started[3]
    expect(draftStep?.request).toEqual({
      inputs: {
        model: "ltx-2-5-guide",
        firstFrame: [made.edited],
        guide: [made.depth],
        mask: [made.mask],
        plannedScene: twoTargetPlan.scene,
        scene: "replace the man, not the woman",
        resolution: "480p",
        seed: 41,
      },
      aspectRatio: "9:16",
    })
    expect(
      accepts(
        motion,
        draftStep ?? { request: { inputs: {}, aspectRatio: null } }
      )
    ).toBe(true)
    const restored = await loop.restore({
      steps: led.steps,
      key,
      draft: drafted.draft,
      answer: "yes",
    })
    if (restored.status !== "restored") {
      throw new Error(`the restore ended ${restored.status}`)
    }
    expect(JSON.stringify(chain.started[4]?.request.inputs)).toContain(
      photos[2] ?? ""
    )
    const ended = await loop.final({
      steps: led.steps,
      key,
      draft: drafted.draft,
      endKey: restored.endKey,
      answer: "yes",
    })
    expect(ended.status).toBe("done")
    const finalStep = chain.started[5]
    expect(finalStep?.request.inputs).toMatchObject({
      guide: [made.depth],
      mask: [made.mask],
      resolution: "1080p",
      seed: 41,
      endKey: [restored.endKey],
    })
    expect(
      accepts(
        motion,
        finalStep ?? { request: { inputs: {}, aspectRatio: null } }
      )
    ).toBe(true)
    expect(chain.started.map((one) => one.key.slice(key.length + 1))).toEqual([
      "plan",
      "read",
      "edit",
      "draft",
      "restore",
      "final",
    ])
    expect(read).toHaveLength(1)
  })

  it("prices the plan, the read, the edit and the draft before any of them runs, each as a run Motion or Image takes", () => {
    const { lead } = leadOf()
    expect(lead.priced.map((one) => one.appId)).toEqual([
      "motion",
      "motion",
      "image",
      "motion",
    ])
    const [plan, clipRead, edit, draft] = lead.priced
    expect(
      accepts(motion, plan ?? { request: { inputs: {}, aspectRatio: null } })
    ).toBe(true)
    expect(
      accepts(
        motion,
        clipRead ?? { request: { inputs: {}, aspectRatio: null } }
      )
    ).toBe(true)
    expect(
      accepts(image(), edit ?? { request: { inputs: {}, aspectRatio: null } })
    ).toBe(true)
    expect(
      accepts(motion, draft ?? { request: { inputs: {}, aspectRatio: null } })
    ).toBe(true)
  })

  it("control: stops after a plan whose kept text is not a plan, before any read runs", async () => {
    const chain = new StageChain()
    const lead = new OwnVideoLead({ ask, heldText: async () => "{}" })
    await expect(
      loopOf(chain).lead({ lead, key: "press-5" })
    ).rejects.toMatchObject({ code: "MOTION_PLAN_UNREADABLE" })
    expect(chain.started).toHaveLength(1)
  })
})
