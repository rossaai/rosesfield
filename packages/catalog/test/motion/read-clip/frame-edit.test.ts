import { type AppDefinition, startRunBodyFor } from "@rosesfield/contract"
import { resolveBinding } from "@rosesfield/generation"
import { hostedModelOf } from "@rosesfield/generation/bindings"
import { type AssetId, assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { app as imageApp } from "#image/app"
import { readApps } from "#list-apps"
import { findWorkflow } from "#list-workflows"
import { planClip } from "#motion/clip-plan"
import {
  aspectRatioOf,
  defaultFrameEditModel,
  editPhotosOf,
  type FrameEditModel,
  frameEditModelsFor,
  frameEditRequestOf,
} from "#motion/comfy/frame-edit"
import { FrameShapeUnfitError } from "#motion/frame-shape-unfit.error"
import { twoTargetPlan } from "./clip-plan-answers"

function idOf(n: number): AssetId {
  return assetIdFormat.parse(`${n}a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d`)
}

const firstFrame = idOf(9)
const photos = [idOf(1), idOf(2), idOf(3)]

function parsedImageApp(): AppDefinition {
  const [parsed] = readApps([{ folder: "image", app: imageApp }])
  if (parsed === undefined) {
    throw new Error("The image app did not parse")
  }
  return parsed
}

const tall = { width: 432, height: 768 }

const twoByThree = { width: 512, height: 768 }

function requestWith(
  model: FrameEditModel | null,
  plan = twoTargetPlan,
  frameSize = tall
) {
  return frameEditRequestOf({
    firstFrame,
    frameSize,
    photos,
    plan: planClip(plan, photos.length),
    model,
    seed: 5,
  })
}

describe("the edit of the clip's first frame", () => {
  it("opens on the open model, Qwen Image Edit 2511, per the open-weights ruling", () => {
    expect(defaultFrameEditModel).toBe("open")
    const { appId, request } = requestWith("open")
    expect(request.inputs.model).toBe("qwen-image-edit-2511")
    expect(request.inputs.seed).toBe(5)
    expect(appId).toBe("image")
    expect(request.place).toBe("held")
  })

  it("sends the first frame first, then the photos the plan uses, and the plan's edit prompt", () => {
    const { request } = requestWith("open")
    expect(request.inputs.references).toEqual([
      firstFrame,
      photos[0],
      photos[2],
    ])
    expect(request.inputs.prompt).toBe(twoTargetPlan.editPrompt)
    expect(request.aspectRatio).toBe("9:16")
  })

  it("passes the image app's own schema and resolves to its 3-reference Qwen graph", () => {
    const { request } = requestWith("open")
    const body = startRunBodyFor(parsedImageApp()).parse({
      inputs: request.inputs,
      place: request.place,
    })
    const binding = resolveBinding(imageApp.engine, body.inputs)
    expect(binding.adapter).toBe("comfy-workflow")
    expect(binding.config.models).toEqual(
      findWorkflow("ads-qwen-image-edit-2511")?.models
    )
  })

  it("runs GPT Image 2.5 Sunburst on the Router as the other choice, with every photo and the frame's orientation", () => {
    const { request } = requestWith("hosted", twoTargetPlan, twoByThree)
    expect(request.inputs).toMatchObject({
      model: "openai/gpt-image-2.5-sunburst",
      images: [firstFrame, photos[0], photos[2]],
      quality: "medium",
      size: "1024x1536",
    })
    expect(request.inputs).not.toHaveProperty("seed")
    expect(request.aspectRatio).toBeNull()
    const binding = resolveBinding(imageApp.engine, request.inputs)
    expect(hostedModelOf(binding)).toBe("openai/gpt-image-2.5-sunburst")
  })

  it("offers GPT Image 2.5 on a 2:3, 3:2 or square clip, within 1 percent, and only Qwen Image Edit 2511 on a 9:16 or 16:9 clip", () => {
    expect(frameEditModelsFor(twoByThree)).toEqual(["open", "hosted"])
    expect(frameEditModelsFor({ width: 768, height: 512 })).toEqual([
      "open",
      "hosted",
    ])
    expect(frameEditModelsFor({ width: 640, height: 640 })).toEqual([
      "open",
      "hosted",
    ])
    expect(frameEditModelsFor({ width: 515, height: 768 })).toEqual([
      "open",
      "hosted",
    ])
    expect(frameEditModelsFor(tall)).toEqual(["open"])
    expect(frameEditModelsFor({ width: 768, height: 432 })).toEqual(["open"])
    expect(frameEditModelsFor({ width: 525, height: 768 })).toEqual(["open"])
  })

  it("edits a 9:16 clip with no editor asked on Qwen Image Edit 2511", () => {
    const { request } = requestWith(null)
    expect(request.inputs.model).toBe("qwen-image-edit-2511")
    expect(request.aspectRatio).toBe("9:16")
  })

  it("refuses GPT Image 2.5 asked for a 9:16 clip with one sentence about the video's shape, and crops nothing", () => {
    const refusal = (() => {
      try {
        return requestWith("hosted")
      } catch (error) {
        return error
      }
    })()
    expect(refusal).toBeInstanceOf(FrameShapeUnfitError)
    expect(refusal).toMatchObject({
      code: "MOTION_EDITOR_SHAPE_UNFIT",
      status: 400,
      message:
        "This editor edits only a square, 2:3 or 3:2 video, and this video has another shape",
    })
  })

  it("accepts GPT Image 2.5 asked for a 2:3 clip, at the editor's own 2:3 size", () => {
    const { request } = requestWith("hosted", twoTargetPlan, twoByThree)
    expect(request.inputs).toMatchObject({
      model: "openai/gpt-image-2.5-sunburst",
      size: "1024x1536",
    })
  })

  it("takes one photo of each target first when the editor takes fewer than the plan uses", () => {
    const plan = planClip(
      {
        ...twoTargetPlan,
        targets: [
          { ...twoTargetPlan.targets[0], photos: [1, 2, 3] },
          { ...twoTargetPlan.targets[1], photos: [4] },
        ],
      },
      4
    )
    expect(editPhotosOf(plan, 2)).toEqual([0, 3])
    expect(editPhotosOf(plan, 15)).toEqual([0, 3, 1, 2])
  })

  it("picks the image app's nearest format for the frame", () => {
    expect(aspectRatioOf({ width: 1280, height: 720 })).toBe("16:9")
    expect(aspectRatioOf({ width: 768, height: 768 })).toBe("1:1")
    expect(aspectRatioOf({ width: 1024, height: 768 })).toBe("4:3")
  })
})
