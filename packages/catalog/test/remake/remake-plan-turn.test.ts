import { resolveBinding } from "@rosesfield/generation"
import { assetIdFormat, ProjectError } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { findWorkflow } from "#list-workflows"
import { type RemakeQuality, shotRequestOf } from "#remake/comfy/remake-engine"
import {
  type PlanFrame,
  planModel,
  planReplyOf,
  planTurnBodyOf,
} from "#remake/comfy/remake-plan-turn"
import { RouterPlanTurn } from "#remake/comfy/router-plan-turn"
import { type FoundShot, planShots } from "#remake/shot-plan"
import { cameraMoves } from "#video/camera-moves"
import { ReplayFetch } from "../motion/motion-replay"

const runId = "3f2e1d0c-9b8a-4776-a655-443322110000"
const photoId = assetIdFormat.parse("1b2c3d4e-5f60-4b7c-9d8e-9f0a1b2c3d4e")

const shots: FoundShot[] = [
  { number: 1, startSeconds: 0, endSeconds: 5 },
  { number: 2, startSeconds: 5, endSeconds: 10 },
]

const plan = {
  shots: [
    {
      people: "none",
      words: "A quiet beach at dawn with low waves.",
      cameraMove: "pull-out",
    },
    { people: "none", words: "A pier over calm water.", cameraMove: null },
  ],
}

function answerOf(text: string): unknown {
  return {
    candidates: [
      { content: { role: "model", parts: [{ text }] }, finishReason: "STOP" },
    ],
    usageMetadata: { promptTokenCount: 812, candidatesTokenCount: 74 },
  }
}

function requestsAt(quality: RemakeQuality) {
  const planned = planShots(
    shots,
    planReplyOf(answerOf(JSON.stringify(plan))),
    "rebuild"
  )
  expect(planned).toHaveLength(2)
  return (planned ?? []).map((shot) =>
    shotRequestOf({
      runId,
      attempt: 1,
      shot,
      clip: null,
      photo: photoId,
      quality,
      instructions: "",
      aspectRatio: "16:9",
      seed: 7,
    })
  )
}

describe("the plan turn of a Remake run", () => {
  it("asks Gemini 3.1 Flash-Lite by default", () => {
    expect(planModel).toBe("vertexai/gemini-3.1-flash-lite")
  })

  it("sends each shot's number, its length and its middle frame, the instructions, no tools and the plan's schema", () => {
    const body = planTurnBodyOf({
      frames: shots.map((shot) => ({
        shot,
        mime: "image/jpeg",
        base64: `frame-${shot.number}`,
      })),
      instructions: " Warm light. ",
    })
    expect(body).not.toHaveProperty("tools")
    expect(body).toMatchObject({
      contents: [
        {
          role: "user",
          parts: [
            { text: "Shot 1, 5 seconds." },
            { inlineData: { mimeType: "image/jpeg", data: "frame-1" } },
            { text: "Shot 2, 5 seconds." },
            { inlineData: { mimeType: "image/jpeg", data: "frame-2" } },
            { text: expect.stringContaining("Warm light.") },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          properties: {
            shots: {
              items: {
                properties: {
                  cameraMove: { enum: cameraMoves.map((move) => move.value) },
                },
              },
            },
          },
        },
      },
    })
  })

  it("reads 2 entries from the answer for an edit of 2 shots with no person", () => {
    expect(planReplyOf(answerOf(JSON.stringify(plan)))).toEqual(plan)
  })

  it("control: an answer that holds no JSON gives no plan, and planShots refuses it", () => {
    const reply = planReplyOf(answerOf("Here is the plan: two beach shots."))
    expect(reply).toBeNull()
    expect(planShots(shots, reply, "rebuild")).toBeNull()
    expect(planReplyOf({ candidates: [] })).toBeNull()
  })

  it("rebuilds each shot on the LTX 2.5 text graph at its smallest resolution and 5 seconds at Draft, with no sound", () => {
    const workflow = findWorkflow("video-ltx-2-5-text")
    for (const request of requestsAt("draft")) {
      expect(request?.app).toBe("video")
      expect(request?.inputs).toMatchObject({
        model: "ltx-2-5",
        resolution: "480p",
        length: 5,
        sound: "off",
      })
      const binding = resolveBinding(
        request?.binding ?? { adapter: "none", config: {} },
        request?.inputs ?? {}
      )
      expect(binding.adapter).toBe("comfy-workflow")
      expect(binding.config.models).toEqual(workflow?.models)
    }
  })

  it("control: the same plan at Final asks for the larger resolution", () => {
    expect(
      requestsAt("final").map((request) => request?.inputs.resolution)
    ).toEqual(["720p", "720p"])
  })
})

const planUrl = `https://api.comfy.org/v2/models/${planModel}`

const frames: PlanFrame[] = shots.map((shot) => ({
  shot,
  mime: "image/jpeg",
  base64: "frame",
}))

async function refusalOf(status: number, json: unknown): Promise<unknown> {
  const replay = new ReplayFetch([
    { method: "POST", url: planUrl, status, json },
  ])
  const turn = new RouterPlanTurn({
    apiKey: "comfyui-owner",
    fetch: replay.fetch,
  })
  return turn
    .ask({ frames, instructions: "" }, "remake-shots|run-1-plan")
    .catch((error: unknown) => error)
}

describe("the plan turn's refusals", () => {
  it.each([
    [
      403,
      { error_type: "not_enabled", detail: "Enable the model." },
      "ENGINE_NOT_ENABLED",
    ],
    [
      403,
      { error_type: "not_enabled", detail: "Not in this workspace." },
      "ENGINE_KEY_OUTSIDE_WORKSPACE",
    ],
    [
      400,
      { error_type: "invalid_input", detail: "The image is too large." },
      "RUN_INPUT_REFUSED",
    ],
    [
      400,
      { error_type: "content_policy_violation", detail: "" },
      "RUN_INPUT_REFUSED",
    ],
    [
      402,
      { error_type: "insufficient_credits", detail: "" },
      "ENGINE_NO_CREDITS",
    ],
  ])("reads a %i answer by its error type, as every Router call does", async (status, json, code) => {
    const refusal = await refusalOf(status, json)
    expect(refusal).toBeInstanceOf(ProjectError)
    expect((refusal as ProjectError).code).toBe(code)
  })

  it("control: a 400 answer with no error type stays a failed run", async () => {
    const refusal = await refusalOf(400, { detail: "" })
    expect((refusal as ProjectError).code).toBe("RUN_FAILED")
  })

  it("sends its key and the idempotency key, and reads the answer", async () => {
    const replay = new ReplayFetch([
      { method: "POST", url: planUrl, status: 200, json: answerOf("{}") },
    ])
    const turn = new RouterPlanTurn({
      apiKey: "comfyui-owner",
      fetch: replay.fetch,
    })
    const answer = await turn.ask({ frames, instructions: "" }, "key-1")
    expect(answer.answer).toEqual(answerOf("{}"))
    expect(answer.cost).toBeNull()
    expect(replay.sent[0]?.headers.get("Idempotency-Key")).toBe("key-1")
    expect(replay.sent[0]?.headers.get("X-API-Key")).toBe("comfyui-owner")
  })
})
