import {
  type HeldOutput,
  type Run,
  type RunInputs,
  startRunBodyFor,
} from "@rosesfield/contract"
import { resolveBinding } from "@rosesfield/generation"
import {
  type AssetId,
  appIdFormat,
  assetIdFormat,
  ProjectError,
  runIdFormat,
} from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { planClip } from "#motion/clip-plan"
import { ClipPlanNoTargetError } from "#motion/clip-plan-no-target.error"
import { motionEndKeySteps } from "#motion/comfy/end-key-steps"
import type { RenderQuality } from "#motion/comfy/guide-ltx-2-5-binding"
import { motionEngine } from "#motion/comfy/motion-binding"
import { readClipOutputNodes } from "#motion/comfy/read-clip-binding"
import { readClipOf, renderHandOffOf } from "#motion/comfy/render-hand-off"
import { ltx25GuideModel } from "#motion/motion-models"
import { motion } from "../motion-replay"
import { twoTargetPlan } from "./clip-plan-answers"

function idOf(n: number): AssetId {
  return assetIdFormat.parse(`${n}b2c3d4e-5f60-4b7c-9d8e-9f0a1b2c3d4e`)
}

const depth = idOf(1)
const mask = idOf(2)
const firstFrame = idOf(3)
const edited = idOf(4)
const endKey = idOf(5)
const photo = idOf(6)

const held: HeldOutput[] = [
  {
    nodeId: readClipOutputNodes.firstFrame,
    assetId: firstFrame,
    kind: "image",
  },
  { nodeId: readClipOutputNodes.mask, assetId: mask, kind: "video" },
  { nodeId: readClipOutputNodes.depth, assetId: depth, kind: "video" },
]

function handOff(quality: RenderQuality, key: AssetId | null): RunInputs {
  return renderHandOffOf({
    read: readClipOf(held),
    editedFrame: edited,
    endKey: key,
    plan: planClip(twoTargetPlan, 3),
    quality,
    seed: 77,
  })
}

function draftRun(inputs: RunInputs, seed: number): Run {
  return {
    id: runIdFormat.parse("8a9b0c1d-2e3f-4a4b-8c6d-7e8f9a0b1c2d"),
    appId: appIdFormat.parse("motion"),
    status: "done",
    inputs,
    count: 1,
    aspectRatio: "9:16",
    seed,
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

/** The value the bound graph writes into the short side, node 702, for these inputs. */
function shortSideOf(inputs: RunInputs): number | null {
  const binding = resolveBinding(motionEngine, inputs)
  const bindings = Array.isArray(binding.config.bindings)
    ? binding.config.bindings
    : []
  const sides = bindings.flatMap((one: unknown) => {
    if (typeof one !== "object" || one === null || !("path" in one)) {
      return []
    }
    const path = one.path
    if (!Array.isArray(path) || path[0] !== "702") {
      return []
    }
    const name = "name" in one ? String(one.name) : ""
    const map = "map" in one && typeof one.map === "object" ? one.map : null
    const value = inputs[name]
    return map !== null && typeof value === "string" && value in map
      ? [Number(Reflect.get(map, value))]
      : []
  })
  return sides.length === 1 ? (sides[0] ?? null) : null
}

describe("the hand-off to the guided render", () => {
  it("names the read's held outputs by the node that saved each, in any order", () => {
    expect(readClipOf(held)).toEqual({ depth, mask, firstFrame })
  })

  it("refuses a read whose mask the engine dropped as black, as nothing found in the clip", () => {
    const refusal = (() => {
      try {
        return readClipOf(held.filter((one) => one.assetId !== mask))
      } catch (error) {
        return error
      }
    })()
    expect(refusal).toBeInstanceOf(ClipPlanNoTargetError)
    expect((refusal as ProjectError).status).toBe(400)
  })

  it("control: a depth saved by the mask's node is not read as the depth", () => {
    const swapped = held.map((one) =>
      one.assetId === depth ? { ...one, nodeId: "99" } : one
    )
    expect(() => readClipOf(swapped)).toThrow(ProjectError)
  })

  it("gives the render the edited frame, the depth as its guide, the mask, the scene, the draft's resolution and the seed, as inputs Motion takes", () => {
    const inputs = handOff("draft", null)
    expect(inputs).toEqual({
      model: ltx25GuideModel,
      photo: [edited],
      clip: [depth],
      mask: [mask],
      scene: twoTargetPlan.scene,
      resolution: "480p",
      seed: 77,
    })
    expect(startRunBodyFor(motion).safeParse({ inputs }).success).toBe(true)
    expect(
      startRunBodyFor(motion).safeParse({ inputs: handOff("final", endKey) })
        .success
    ).toBe(true)
  })

  it("renders the draft at 512 and the final at 768 with the draft's seed, through the end-key steps and the render's own binding", () => {
    const steps = motionEndKeySteps({
      inputs: handOff("draft", null),
      photos: [photo],
      aspectRatio: "9:16",
      frameSize: { width: 432, height: 768 },
    })
    const draftInputs = steps.draft.request.inputs
    expect(draftInputs).toMatchObject({ resolution: "480p", seed: 77 })
    expect(shortSideOf(draftInputs)).toBe(512)
    const final = steps.final(draftRun(draftInputs, 77), endKey).request.inputs
    expect(final).toMatchObject({
      resolution: "720p",
      seed: 77,
      endKey: [endKey],
    })
    expect(final).not.toHaveProperty("shortSide")
    expect(shortSideOf(final)).toBe(768)
  })

  it("control: a short side sent beside the resolution is refused by Motion, so no second size can override the first", () => {
    const inputs = { ...handOff("final", endKey), shortSide: 512 }
    expect(startRunBodyFor(motion).safeParse({ inputs }).success).toBe(false)
  })
})
