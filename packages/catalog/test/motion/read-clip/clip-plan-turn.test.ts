import { ProjectError } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { comfyCreditsPerUsd } from "#comfy/comfy-credits"
import { ClipPlanNoTargetError } from "#motion/clip-plan-no-target.error"
import {
  type ClipPlanInput,
  clipPlanBodyOf,
  clipPlanModel,
  clipPlanReplyOf,
  type PlanImage,
} from "#motion/comfy/clip-plan-turn"
import { RouterClipPlanTurn } from "#motion/comfy/router-clip-plan-turn"
import {
  chatAnswerOf,
  noTargetPlan,
  PlanReplay,
  planReply,
  twoTargetPlan,
} from "./clip-plan-answers"

const frame: PlanImage = { mime: "image/jpeg", base64: "ZnJhbWU=" }
const photo: PlanImage = { mime: "image/png", base64: "cGhvdG8=" }

const input: ClipPlanInput = {
  frames: [frame, frame, frame, frame],
  photos: [photo, photo, photo],
  sentence: " replace the man, not the woman ",
}

function turnOn(replay: PlanReplay): RouterClipPlanTurn {
  return new RouterClipPlanTurn({
    apiKey: "comfyui-owner",
    fetch: replay.fetch,
    timeoutMs: 1000,
  })
}

describe("the body of the plan turn", () => {
  it("asks the bound model on the chat route with 4 frames, each photo numbered, the sentence and a strict schema", () => {
    const body = clipPlanBodyOf(input)
    expect(body).toMatchObject({
      model: clipPlanModel,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: { name: "clip_plan", strict: true },
      },
    })
    expect(body).not.toHaveProperty("tools")
    const [system, user] = body.messages as {
      role: string
      content: unknown
    }[]
    expect(system?.content).toContain("Never name a depth map, a mask")
    const parts = user?.content as { type: string; text?: string }[]
    expect(parts.filter((part) => part.type === "image_url")).toHaveLength(7)
    expect(parts.map((part) => part.text ?? "image")).toEqual([
      "The video's frames, first to last.",
      ...Array(4).fill("image"),
      "Photo 1.",
      "image",
      "Photo 2.",
      "image",
      "Photo 3.",
      "image",
      "The person's sentence: replace the man, not the woman",
    ])
  })

  it("reads the plan from the message, fenced or not, and null from an answer with no JSON", () => {
    const json = JSON.stringify(twoTargetPlan)
    expect(clipPlanReplyOf(chatAnswerOf(json))).toEqual(twoTargetPlan)
    expect(
      clipPlanReplyOf(chatAnswerOf(`\`\`\`json\n${json}\n\`\`\``))
    ).toEqual(twoTargetPlan)
    expect(clipPlanReplyOf(chatAnswerOf("A man walks."))).toBeNull()
    expect(clipPlanReplyOf({ choices: [] })).toBeNull()
  })
})

describe("the bound plan call", () => {
  it("sends the key and the idempotency key to the Router, and returns the plan with its credits", async () => {
    const replay = new PlanReplay([planReply(twoTargetPlan)])
    const answer = await turnOn(replay).ask(input, "run-7-plan")
    expect(replay.sent).toHaveLength(1)
    expect(replay.sent[0]?.headers.get("Idempotency-Key")).toBe("run-7-plan")
    expect(replay.sent[0]?.headers.get("X-API-Key")).toBe("comfyui-owner")
    expect(answer.plan.targets).toHaveLength(2)
    expect(answer.plan.unusedPhotos).toEqual([1])
    expect(answer.cost?.amount).toBeCloseTo(0.09 / comfyCreditsPerUsd)
    expect(answer.attempts).toBe(1)
  })

  it("asks again with the same key after a timeout and a 503, up to its retry maximum", async () => {
    const replay = new PlanReplay([
      { failure: "timeout" },
      { status: 503, json: { error_type: "service_unavailable" } },
      planReply(twoTargetPlan),
    ])
    const answer = await turnOn(replay).ask(input, "run-8-plan")
    expect(answer.attempts).toBe(3)
    expect(
      replay.sent.map((one) => one.headers.get("Idempotency-Key"))
    ).toEqual(["run-8-plan", "run-8-plan", "run-8-plan"])
  })

  it("control: a fourth failure past the retry maximum fails the call", async () => {
    const replay = new PlanReplay([
      { failure: "timeout" },
      { failure: "timeout" },
      { failure: "timeout" },
      planReply(twoTargetPlan),
    ])
    const refusal = await turnOn(replay)
      .ask(input, "run-9-plan")
      .catch((error: unknown) => error)
    expect((refusal as ProjectError).code).toBe("ENGINE_UNAVAILABLE")
    expect(replay.sent).toHaveLength(RouterClipPlanTurn.maxRetries + 1)
  })

  it("refuses a plan with no target once, without asking again", async () => {
    const replay = new PlanReplay([
      planReply(noTargetPlan),
      planReply(twoTargetPlan),
    ])
    const refusal = await turnOn(replay)
      .ask(input, "run-10-plan")
      .catch((error: unknown) => error)
    expect(refusal).toBeInstanceOf(ClipPlanNoTargetError)
    expect(replay.sent).toHaveLength(1)
  })

  it("refuses 3 frames or 16 photos before any request", async () => {
    const replay = new PlanReplay([])
    const turn = turnOn(replay)
    for (const wrong of [
      { ...input, frames: [frame, frame, frame] },
      { ...input, photos: Array(16).fill(photo) },
    ]) {
      const refusal = await turn
        .ask(wrong, "run-11-plan")
        .catch((error: unknown) => error)
      expect((refusal as ProjectError).code).toBe("MOTION_PLAN_UNREADABLE")
    }
    expect(replay.sent).toHaveLength(0)
  })

  it("reads a 402 as no credits and does not ask again", async () => {
    const replay = new PlanReplay([
      { status: 402, json: { error_type: "insufficient_credits" } },
    ])
    const refusal = await turnOn(replay)
      .ask(input, "run-12-plan")
      .catch((error: unknown) => error)
    expect(refusal).toBeInstanceOf(ProjectError)
    expect((refusal as ProjectError).code).toBe("ENGINE_NO_CREDITS")
  })
})
