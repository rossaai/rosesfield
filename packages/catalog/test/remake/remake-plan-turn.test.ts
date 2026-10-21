import { resolveBinding } from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { findWorkflow } from "#list-workflows"
import { type RemakeQuality, shotRequestOf } from "#remake/comfy/remake-engine"
import {
  planModel,
  planReplyOf,
  planTurnBodyOf,
} from "#remake/comfy/remake-plan-turn"
import { type FoundShot, planShots } from "#remake/shot-plan"
import { cameraMoves } from "#video/camera-moves"

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
