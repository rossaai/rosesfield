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
  frameEditRequestOf,
} from "#motion/comfy/frame-edit"
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

function requestWith(model: FrameEditModel, plan = twoTargetPlan) {
  return frameEditRequestOf({
    runId: "run-2",
    firstFrame,
    frameSize: { width: 432, height: 768 },
    photos,
    plan: planClip(plan, photos.length),
    model,
    seed: 5,
  })
}

describe("the edit of the clip's first frame", () => {
  it("opens on the open model, Qwen Image Edit 2511, per the open-weights ruling", () => {
    expect(defaultFrameEditModel).toBe("open")
    const request = requestWith("open")
    expect(request.inputs.model).toBe("qwen-image-edit-2511")
    expect(request.app).toBe("image")
    expect(request.idempotencyKey).toBe("run-2-edit")
  })

  it("sends the first frame first, then the photos the plan uses, and the plan's edit prompt", () => {
    const request = requestWith("open")
    expect(request.inputs.references).toEqual([
      firstFrame,
      photos[0],
      photos[2],
    ])
    expect(request.inputs.prompt).toBe(twoTargetPlan.editPrompt)
    expect(request.aspectRatio).toBe("9:16")
  })

  it("passes the image app's own schema and resolves to its 3-reference Qwen graph", () => {
    const request = requestWith("open")
    const body = startRunBodyFor(parsedImageApp()).parse({
      inputs: request.inputs,
    })
    const binding = resolveBinding(request.binding, body.inputs)
    expect(binding.adapter).toBe("comfy-workflow")
    expect(binding.config.models).toEqual(
      findWorkflow("ads-qwen-image-edit-2511")?.models
    )
  })

  it("runs GPT Image 2.5 Sunburst on the Router as the other choice, with every photo and the frame's orientation", () => {
    const request = requestWith("hosted")
    expect(request.inputs).toMatchObject({
      model: "openai/gpt-image-2.5-sunburst",
      images: [firstFrame, photos[0], photos[2]],
      quality: "medium",
      size: "1024x1536",
    })
    const binding = resolveBinding(request.binding, request.inputs)
    expect(hostedModelOf(binding)).toBe("openai/gpt-image-2.5-sunburst")
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
