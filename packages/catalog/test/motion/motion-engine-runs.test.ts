import {
  type AppDefinition,
  type Run,
  type RunInputs,
  startRunBody,
  startRunBodyFor,
} from "@rosesfield/contract"
import { resolveBinding } from "@rosesfield/generation"
import { hostedModelOf, type StepRun } from "@rosesfield/generation/bindings"
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
import { motionEndKeySteps } from "#motion/comfy/end-key-steps"
import { frameEditModels } from "#motion/comfy/frame-edit"
import { readClipRequestOf } from "#motion/comfy/read-clip-binding"
import { readClipOf, renderHandOffOf } from "#motion/comfy/render-hand-off"
import { motion } from "./motion-replay"
import { twoTargetPlan } from "./read-clip/clip-plan-answers"

function idOf(n: number): AssetId {
  return assetIdFormat.parse(`${n}c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f`)
}

const clip = idOf(1)
const photo = idOf(2)

function image(): AppDefinition {
  const [parsed] = readApps([{ folder: "image", app: imageApp }])
  if (parsed === undefined) {
    throw new Error("The image app did not parse")
  }
  return parsed
}

function bodyOf(step: StepRun): unknown {
  const { inputs, aspectRatio, place } = step.request
  return {
    inputs,
    ...(aspectRatio === null ? {} : { aspectRatio }),
    ...(place === undefined ? {} : { place }),
  }
}

function accepts(app: AppDefinition, step: StepRun): boolean {
  expect(step.appId).toBe(app.id)
  const result = startRunBodyFor(app).safeParse(bodyOf(step))
  return result.success && startRunBody.safeParse(bodyOf(step)).success
}

const plan = planClip(twoTargetPlan, 3)

const draftInputs: RunInputs = renderHandOffOf({
  read: readClipOf([
    { nodeId: "13", assetId: idOf(3), kind: "video" },
    { nodeId: "28", assetId: idOf(4), kind: "video" },
    { nodeId: "31", assetId: idOf(5), kind: "image" },
  ]),
  editedFrame: idOf(6),
  endKey: null,
  plan,
  quality: "draft",
  seed: 9,
})

function doneDraft(inputs: RunInputs): Run {
  return {
    id: runIdFormat.parse("9d0e1f2a-3b4c-4d5e-8f6a-7b8c9d0e1f2a"),
    appId: appIdFormat.parse("motion"),
    status: "done",
    inputs,
    count: 1,
    aspectRatio: "9:16",
    seed: 9,
    outputs: [idOf(7)],
    held: [{ nodeId: "1011", assetId: idOf(8), kind: "image" }],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: "2026-10-29T10:00:00.000Z",
    finishedAt: null,
  }
}

describe("the runs Motion's engine starts", () => {
  const ask = {
    inputs: draftInputs,
    photos: [photo],
    aspectRatio: "9:16",
    frameSize: { width: 432, height: 768 },
  }

  it("accepts the read of a clip, held, with its targets and no photo", () => {
    const read = readClipRequestOf({ clip, plan })
    expect(accepts(motion, read)).toBe(true)
  })

  it("accepts the draft on the LTX 2.5 guide with the mask, the scene, the resolution and the seed", () => {
    expect(accepts(motion, motionEndKeySteps(ask).draft)).toBe(true)
  })

  it("accepts the restore of the draft's last frame, held, on the open editor's own schema and on the hosted editor", () => {
    const steps = motionEndKeySteps(ask, frameEditModels.open)
    const frame = steps.frameOf(doneDraft(draftInputs))
    expect(frame).toBe(idOf(8))
    expect(accepts(image(), steps.restore(idOf(8)))).toBe(true)
    const hosted = motionEndKeySteps(ask).restore(idOf(8))
    expect(hosted.request.place).toBe("held")
    expect(
      hostedModelOf(resolveBinding(imageApp.engine, hosted.request.inputs))
    ).toBe("openai/gpt-image-2.5-sunburst")
  })

  it("accepts the final with the end key", () => {
    const steps = motionEndKeySteps(ask)
    const draft = doneDraft(steps.draft.request.inputs)
    expect(accepts(motion, steps.final(draft, idOf(9)))).toBe(true)
  })

  it("control: refuses the final with a second size and the read with no targets", () => {
    const steps = motionEndKeySteps(ask)
    const final = steps.final(doneDraft(draftInputs), idOf(9))
    const twoSizes: StepRun = {
      ...final,
      request: {
        ...final.request,
        inputs: { ...final.request.inputs, shortSide: 768 },
      },
    }
    expect(accepts(motion, twoSizes)).toBe(false)
    const read = readClipRequestOf({ clip, plan })
    const noTargets: StepRun = {
      ...read,
      request: {
        ...read.request,
        inputs: { ...read.request.inputs, targets: "" },
      },
    }
    expect(accepts(motion, noTargets)).toBe(false)
  })
})
