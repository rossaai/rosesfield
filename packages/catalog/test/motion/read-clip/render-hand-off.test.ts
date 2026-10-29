import type { RunInputs } from "@rosesfield/contract"
import { type AssetId, assetIdFormat, ProjectError } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { planClip } from "#motion/clip-plan"
import { ClipPlanNoTargetError } from "#motion/clip-plan-no-target.error"
import { readClipOutputNodes } from "#motion/comfy/read-clip-binding"
import {
  type MadeOutput,
  type RenderQuality,
  readClipOf,
  renderCoreModel,
  renderHandOffOf,
} from "#motion/comfy/render-hand-off"
import { twoTargetPlan } from "./clip-plan-answers"
import { renderCoreStub } from "./render-core-stub"

function idOf(n: number): AssetId {
  return assetIdFormat.parse(`${n}b2c3d4e-5f60-4b7c-9d8e-9f0a1b2c3d4e`)
}

const depth = idOf(1)
const mask = idOf(2)
const firstFrame = idOf(3)
const edited = idOf(4)
const endKey = idOf(5)

const made: MadeOutput[] = [
  {
    nodeId: readClipOutputNodes.firstFrame,
    assetId: firstFrame,
    kind: "image",
  },
  { nodeId: readClipOutputNodes.mask, assetId: mask, kind: "video" },
  { nodeId: readClipOutputNodes.depth, assetId: depth, kind: "video" },
]

function handOff(quality: RenderQuality, key: AssetId | null) {
  return renderHandOffOf({
    read: readClipOf(made),
    editedFrame: edited,
    endKey: key,
    plan: planClip(twoTargetPlan, 3),
    quality,
    seed: 77,
  })
}

/** What the stub's binding would read from these inputs, or the names it misses. */
function stubProblems(inputs: RunInputs): string[] {
  return renderCoreStub.bindings.flatMap((binding) => {
    if (binding.from !== "input") {
      return []
    }
    const value = inputs[binding.name]
    if (value === undefined) {
      return renderCoreStub.optional.includes(binding.name)
        ? []
        : [`${binding.name} is missing`]
    }
    const isAsset = "index" in binding
    return isAsset === Array.isArray(value)
      ? []
      : [`${binding.name} is ${isAsset ? "not an asset" : "an asset"}`]
  })
}

describe("the hand-off to the guided render", () => {
  it("names the read's outputs by the node that saved each, in any order", () => {
    expect(readClipOf(made)).toEqual({ depth, mask, firstFrame })
  })

  it("refuses a read whose mask the engine dropped as black, as nothing found in the clip", () => {
    const refusal = (() => {
      try {
        return readClipOf(made.filter((one) => one.assetId !== mask))
      } catch (error) {
        return error
      }
    })()
    expect(refusal).toBeInstanceOf(ClipPlanNoTargetError)
    expect((refusal as ProjectError).status).toBe(400)
  })

  it("control: a depth saved by the mask's node is not read as the depth", () => {
    const swapped = made.map((one) =>
      one.assetId === depth ? { ...one, nodeId: "99" } : one
    )
    expect(() => readClipOf(swapped)).toThrow(ProjectError)
  })

  it("gives the render the edited frame, the depth as its guide, the mask, the scene and the draft's short side", () => {
    const { inputs, seed } = handOff("draft", null)
    expect(inputs).toEqual({
      model: renderCoreModel,
      photo: [edited],
      clip: [depth],
      mask: [mask],
      scene: twoTargetPlan.scene,
      shortSide: 512,
    })
    expect(seed).toBe(77)
    expect(renderCoreModel).toBe(renderCoreStub.model)
  })

  it("adds the end key and the final's short side, with the same seed", () => {
    const { inputs, seed } = handOff("final", endKey)
    expect(inputs.endKey).toEqual([endKey])
    expect(inputs.shortSide).toBe(renderCoreStub.shortSides.final)
    expect(seed).toBe(77)
  })

  it("sets every input the core's binding reads, assets as assets and values as values", () => {
    expect(stubProblems(handOff("draft", null).inputs)).toEqual([])
    expect(stubProblems(handOff("final", endKey).inputs)).toEqual([])
  })

  it("control: the stub finds a dropped mask and a scene sent as an asset", () => {
    const { inputs } = handOff("draft", null)
    const { mask: _, ...noMask } = inputs
    expect(stubProblems({ ...noMask, scene: [edited] })).toEqual([
      "mask is missing",
      "scene is an asset",
    ])
  })
})
