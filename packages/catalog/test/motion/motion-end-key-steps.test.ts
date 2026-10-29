import { appId, assetId, type Run, runId } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { listApps } from "#list-apps"
import {
  endKeyEditor,
  type MotionEndKeyAsk,
  motionEndKeySteps,
  restorePrompt,
} from "#motion/comfy/end-key-steps"
import { ltx25GuideModel } from "#motion/motion-models"

const photo = assetId.parse("2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d")
const guide = assetId.parse("3b4c5d6e-7f8a-4b9c-8d1e-2f3a4b5c6d7e")
const people = assetId.parse("4c5d6e7f-8a9b-4c0d-9e2f-3a4b5c6d7e8f")
const frame = assetId.parse("5d6e7f8a-9b0c-4d1e-af3a-4b5c6d7e8f9a")
const key = assetId.parse("6e7f8a9b-0c1d-4e2f-8a4b-5c6d7e8f9a0b")
const jacket = assetId.parse("7f8a9b0c-1d2e-4f3a-9b5c-6d7e8f9a0b1c")

const ask: MotionEndKeyAsk = {
  inputs: {
    photo: [photo],
    clip: [guide],
    mask: [people],
    scene: "A man runs down a cobbled street.",
    resolution: "720p",
    endKey: [frame],
  },
  photos: [photo, jacket],
  aspectRatio: "2:3",
  frameSize: { width: 512, height: 768 },
}

function draftRun(seed: number | null): Run {
  return {
    id: runId.parse("8a9b0c1d-2e3f-4a4b-8c6d-7e8f9a0b1c2d"),
    appId: appId.parse("motion"),
    status: "done",
    inputs: {},
    count: 1,
    aspectRatio: "2:3",
    seed,
    outputs: [guide],
    held: [{ nodeId: "1011", assetId: frame, kind: "image" }],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: "2026-10-29T10:00:00.000Z",
    finishedAt: null,
  }
}

describe("Motion's end-key steps", () => {
  const steps = motionEndKeySteps(ask)

  it("makes the draft on the LTX 2.5 guide graph at 480p with no end key, keeping the clip, mask and scene", () => {
    expect(steps.draft.appId).toBe("motion")
    expect(steps.draft.request).toEqual({
      inputs: {
        photo: [photo],
        clip: [guide],
        mask: [people],
        scene: "A man runs down a cobbled street.",
        model: ltx25GuideModel,
        resolution: "480p",
      },
      aspectRatio: "2:3",
    })
  })

  it("finds the draft's last frame among the outputs it holds, by node 1011", () => {
    expect(steps.frameOf(draftRun(1))).toBe(frame)
    expect(steps.frameOf({ ...draftRun(1), held: [] })).toBeNull()
    expect(
      steps.frameOf({
        ...draftRun(1),
        held: [{ nodeId: "1010", assetId: frame, kind: "image" }],
      })
    ).toBeNull()
  })

  it("restores the draft's last frame on the editor the binding names, with the frame first and then your photos", () => {
    const restore = steps.restore(frame)
    expect(restore.appId).toBe(endKeyEditor.appId)
    expect(restore.request.inputs).toEqual({
      quality: "medium",
      model: endKeyEditor.model,
      prompt: restorePrompt,
      size: "1024x1536",
      images: [frame, photo, jacket],
    })
    expect(restore.request.place).toBe("held")
    expect(listApps().map((one) => one.id)).toContain(endKeyEditor.appId)
    const many = motionEndKeySteps({
      ...ask,
      photos: Array.from({ length: 20 }, () => jacket),
    }).restore(frame).request.inputs.images
    expect(Array.isArray(many) ? [many.length, many[0]] : []).toEqual([
      endKeyEditor.mostImages,
      frame,
    ])
  })

  it("makes the final at 720p with the draft's seed and the restored end key", () => {
    const final = steps.final(draftRun(20261028), key)
    expect(final.appId).toBe("motion")
    expect(final.request.inputs).toMatchObject({
      model: ltx25GuideModel,
      resolution: "720p",
      seed: 20261028,
      endKey: [key],
      mask: [people],
      clip: [guide],
    })
    expect(steps.final(draftRun(null), key).request.inputs).not.toHaveProperty(
      "seed"
    )
  })

  it("asks the editor for the frame's shape", () => {
    const sizes = [
      { width: 512, height: 768 },
      { width: 432, height: 768 },
      { width: 768, height: 432 },
      { width: 512, height: 512 },
    ].map(
      (frameSize) =>
        motionEndKeySteps({ ...ask, frameSize }).restore(frame).request.inputs
          .size
    )
    expect(sizes).toEqual(["1024x1536", "1024x1536", "1536x1024", "1024x1024"])
  })
})
