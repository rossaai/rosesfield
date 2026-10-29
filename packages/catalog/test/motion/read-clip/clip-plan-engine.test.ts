import { startRunBodyFor } from "@rosesfield/contract"
import type { EngineFile, EngineRequest } from "@rosesfield/generation"
import { resolveBinding } from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { keptPlanOf } from "#motion/clip-plan"
import { ClipPlanNoTargetError } from "#motion/clip-plan-no-target.error"
import { clipPlanAdapter } from "#motion/comfy/clip-plan-binding"
import {
  type ClipFrames,
  ClipPlanGenerationEngine,
} from "#motion/comfy/clip-plan-engine"
import { clipPlanModel, type PlanImage } from "#motion/comfy/clip-plan-turn"
import { DemoClipPlanTurn } from "#motion/comfy/demo-clip-plan-turn"
import { RouterClipPlanTurn } from "#motion/comfy/router-clip-plan-turn"
import { planModel } from "#motion/motion-models"
import { motion } from "../motion-replay"
import { PlanReplay, planReply, twoTargetPlan } from "./clip-plan-answers"

function idOf(n: number): string {
  return assetIdFormat.parse(`${n}e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b`)
}

function fileOf(n: number, mime: string): EngineFile {
  return {
    assetId: assetIdFormat.parse(idOf(n)),
    kind: mime.startsWith("video/") ? "video" : "image",
    mime,
    bytes: Uint8Array.of(n, n, n),
  }
}

const clip = fileOf(1, "video/mp4")
const frames = [2, 3, 4, 5].map((n) => fileOf(n, "image/jpeg"))
const photos = [6, 7, 8].map((n) => fileOf(n, "image/png"))

function requestOf(withFrames: boolean): EngineRequest {
  const { inputs } = startRunBodyFor(motion).parse({
    inputs: {
      model: planModel,
      clip: [clip.assetId],
      photo: photos.map((one) => one.assetId),
      ...(withFrames ? { frames: frames.map((one) => one.assetId) } : {}),
      scene: "replace the man, not the woman",
    },
  })
  return {
    idempotencyKey: "plan-run-1",
    binding: resolveBinding(motion.engine, inputs),
    inputs,
    files: [clip, ...(withFrames ? frames : []), ...photos],
    count: 1,
    aspectRatio: null,
    seed: null,
    outputKind: "video",
  }
}

function liveOn(replay: PlanReplay, grab: ClipFrames | null = null) {
  return new ClipPlanGenerationEngine({
    turn: new RouterClipPlanTurn({
      apiKey: "comfyui-owner",
      fetch: replay.fetch,
      timeoutMs: 1000,
    }),
    origin: "live",
    frames: grab,
  })
}

function textOf(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

describe("the plan engine", () => {
  it("runs Motion's plan model and no graph", () => {
    const engine = new ClipPlanGenerationEngine({
      turn: new DemoClipPlanTurn(),
      origin: "demo",
    })
    const binding = requestOf(true).binding
    expect(binding.adapter).toBe(clipPlanAdapter)
    expect(engine.canRun(binding)).toBe(true)
    expect(
      engine.canRun(
        resolveBinding(motion.engine, {
          example: "own",
          model: "motion-read-clip",
        })
      )
    ).toBe(false)
  })

  it("plans in its submit on the run's key, with the 4 frames, each photo and the sentence, and keeps the plan as its one text output", async () => {
    const replay = new PlanReplay([planReply(twoTargetPlan)])
    const submission = await liveOn(replay).submit(requestOf(true))
    expect(replay.sent).toHaveLength(1)
    expect(replay.sent[0]?.headers.get("Idempotency-Key")).toBe("plan-run-1")
    const body = replay.sent[0]?.body as {
      model: string
      messages: { content: { type: string; text?: string }[] }[]
    }
    expect(body.model).toBe(clipPlanModel)
    const parts = body.messages[1]?.content ?? []
    expect(parts.filter((part) => part.type === "image_url")).toHaveLength(7)
    expect(parts.at(-1)?.text).toBe(
      "The person's sentence: replace the man, not the woman"
    )
    expect(submission.models).toEqual([clipPlanModel])
    const [output] = submission.finished?.outputs ?? []
    expect(output).toMatchObject({ kind: "text", mime: "text/plain" })
    const plan = keptPlanOf(textOf(output?.bytes ?? new Uint8Array()))
    expect(plan.targets.map((one) => one.photos)).toEqual([[0], [2]])
    expect(plan.unusedPhotos).toEqual([1])
    expect(submission.finished?.cost?.amount).toBeGreaterThan(0)
  })

  it("reads the frames from the clip where the server opens a video, and refuses the plan where it cannot", async () => {
    const grabbed: EngineFile[] = []
    const grab: ClipFrames = {
      secondsOf: async () => 4,
      framesOf: async (file) => {
        grabbed.push(file)
        return Array.from(
          { length: 4 },
          (): PlanImage => ({ mime: "image/jpeg", base64: "ZnJhbWU=" })
        )
      },
    }
    const replay = new PlanReplay([planReply(twoTargetPlan)])
    await liveOn(replay, grab).submit(requestOf(false))
    expect(grabbed.map((one) => one.assetId)).toEqual([clip.assetId])
    await expect(
      liveOn(new PlanReplay([])).submit(requestOf(false))
    ).rejects.toMatchObject({ code: "MOTION_PLAN_UNREADABLE" })
  })

  it("refuses a plan that finds nothing to change before any graph runs", async () => {
    const replay = new PlanReplay([
      planReply({ targets: [], editPrompt: "", scene: "" }),
    ])
    await expect(liveOn(replay).submit(requestOf(true))).rejects.toBeInstanceOf(
      ClipPlanNoTargetError
    )
  })

  it("plans on the demo engine with no model: each of the first 3 photos goes to one thing, and the rest match nothing", async () => {
    const turn = new DemoClipPlanTurn()
    const image: PlanImage = { mime: "image/png", base64: "cGhvdG8=" }
    const asked = (count: number) =>
      turn.ask(
        {
          frames: [image, image, image, image],
          photos: Array.from({ length: count }, () => image),
          sentence: "",
        },
        "demo-key"
      )
    const five = await asked(5)
    expect(five.plan.targets.map((one) => one.photos)).toEqual([[0], [1], [2]])
    expect(five.plan.unusedPhotos).toEqual([3, 4])
    expect(five.cost).toBeNull()
    expect((await asked(1)).plan.unusedPhotos).toEqual([])
    await expect(asked(0)).rejects.toBeInstanceOf(ClipPlanNoTargetError)
  })

  it("refuses a photo that is not a PNG, JPEG or WebP file as a photo, naming its place, and asks the planner nothing", async () => {
    const replay = new PlanReplay([])
    const request = requestOf(true)
    const gif = fileOf(7, "image/gif")
    const files = request.files.map((one) =>
      one.assetId === gif.assetId ? gif : one
    )
    await expect(
      liveOn(replay).submit({ ...request, files })
    ).rejects.toMatchObject({
      code: "MOTION_PHOTO_UNREADABLE",
      inputs: ["photo"],
      message: "Photo 2 is not a PNG, JPEG or WebP file. Pick another photo.",
    })
    expect(replay.sent).toHaveLength(0)
  })
})
