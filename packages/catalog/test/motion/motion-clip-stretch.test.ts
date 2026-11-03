import { parseComfyWorkflow, resolveBinding } from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { findWorkflow } from "#list-workflows"
import {
  ClipLengthRefusedError,
  isClipLongEnough,
} from "#motion/clip-length-refused.error"
import { clipPlanLimits, planFrameTimesOf } from "#motion/clip-plan"
import { motionEngine } from "#motion/comfy/motion-binding"
import {
  graphClipRangeOf,
  graphClipSeconds,
  graphModel,
  ltx25GuideModel,
  readClipModel,
  swapModel,
} from "#motion/motion-models"

const photo = assetIdFormat.parse("2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d")
const clip = assetIdFormat.parse("3b4c5d6e-7f8a-4b9c-8d1e-2f3a4b5c6d7e")

type Slice = { start: unknown; duration: unknown }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function slicesOf(workflow: unknown): Slice[] {
  const nodes = isRecord(workflow) ? Object.values(workflow) : []
  return nodes.flatMap((node) => {
    if (!isRecord(node) || !isRecord(node.inputs)) {
      return []
    }
    return node.class_type === "Video Slice"
      ? [{ start: node.inputs.start_time, duration: node.inputs.duration }]
      : []
  })
}

function boundSlices(model: string): Slice[] {
  const inputs = {
    model,
    photo: [photo],
    clip: [clip],
    firstFrame: [photo],
    guide: [clip],
    plannedScene: "A street at night",
    resolution: "480p",
    sound: "off",
  }
  return slicesOf(
    parseComfyWorkflow(resolveBinding(motionEngine, inputs)).workflow
  )
}

describe("the stretch of your video each Motion graph keeps", () => {
  it.each([
    { model: ltx25GuideModel, seconds: 10 },
    { model: graphModel, seconds: 10 },
    { model: swapModel, seconds: 5 },
  ])(
    "is the first $seconds seconds on $model, the stretch the screen names, from the Slice node the graph runs",
    ({ model, seconds }) => {
      expect(graphClipSeconds[model]).toBe(seconds)
      const slices = boundSlices(model)
      expect(slices.length).toBeGreaterThan(0)
      for (const slice of slices) {
        expect(slice).toEqual({ start: 0, duration: seconds })
      }
    }
  )

  it("reads your video for the plan in the same 10 seconds the LTX 2.5 render keeps", () => {
    const read = findWorkflow("motion-read-clip")
    expect(read).not.toBeNull()
    expect(slicesOf(read?.graph)).toEqual([
      { start: 0, duration: graphClipSeconds[ltx25GuideModel] },
    ])
    expect(clipPlanLimits.longestSeconds).toBe(
      graphClipSeconds[ltx25GuideModel]
    )
    expect(graphClipRangeOf(readClipModel)).toBeNull()
  })

  it("takes the shortest video every graph renders, and a model that is no Motion graph takes none", () => {
    for (const model of [ltx25GuideModel, graphModel, swapModel]) {
      expect(graphClipRangeOf(model)?.min).toBe(2)
    }
    expect(graphClipRangeOf("lab/move-v1")).toBeNull()
  })
})

describe("a video longer than Motion keeps", () => {
  it("is planned from frames inside the stretch the render keeps", () => {
    const times = planFrameTimesOf(38)
    expect(times).toHaveLength(4)
    expect(times[0]).toBe(0)
    expect(Math.max(...times)).toBeLessThanOrEqual(10)
    expect(times.at(-1)).toBeCloseTo(9.95)
  })

  it("is planned from its whole length when it is shorter than the stretch, the control", () => {
    expect(planFrameTimesOf(4).at(-1)).toBeCloseTo(3.95)
  })

  it("goes through for the agent and MCP, and a video under 2 seconds is still refused in the screen's words", () => {
    expect(isClipLongEnough(38)).toBe(true)
    expect(isClipLongEnough(2)).toBe(true)
    expect(isClipLongEnough(1.5)).toBe(false)
    expect(new ClipLengthRefusedError({ seconds: 1.5 }).message).toBe(
      "This clip runs 1.5 seconds. Pick one of 2 seconds or more."
    )
  })
})
