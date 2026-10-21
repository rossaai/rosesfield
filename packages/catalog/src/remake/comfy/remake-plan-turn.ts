import { z } from "zod"
import type { ModelTask } from "#comfy/model-tasks"
import {
  type FoundShot,
  remakeLimits,
  shotSecondsOf,
} from "#remake/shot-plan"
import { cameraMoves } from "#video/camera-moves"

export type PlanFrame = {
  shot: FoundShot
  mime: "image/jpeg" | "image/png"
  base64: string
}

export type PlanTurnInput = {
  frames: readonly PlanFrame[]
  instructions: string
}

export const planTask: ModelTask = "chat"

export const planModel = "vertexai/gemini-3.1-flash-lite"

const planOutputTokens = 2048

const planRules = [
  "You plan the shots of a short video edit. You get one middle frame of each shot, in order, with the shot's number and length.",
  "Return one entry per shot, in the same order, and nothing else.",
  "people: none when the frame shows no person, one when it shows exactly one person, several when it shows more than one.",
  `words: for a shot with none or several, up to ${remakeLimits.longestWords} characters in plain words that say what the shot shows, so a video model can make it again. Name no person, brand, film or model. For a shot with one person, null.`,
  "cameraMove: for a shot with none or several, the camera move that matches the shot, or null when none matches. For a shot with one person, null.",
].join("\n")

const cameraMoveValues = cameraMoves.map((move) => move.value)

const responseSchema = {
  type: "OBJECT",
  properties: {
    shots: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          people: { type: "STRING", enum: ["none", "one", "several"] },
          words: { type: "STRING", nullable: true },
          cameraMove: {
            type: "STRING",
            enum: cameraMoveValues,
            nullable: true,
          },
        },
        required: ["people", "words", "cameraMove"],
      },
    },
  },
  required: ["shots"],
}

function instructionsPart(instructions: string): { text: string }[] {
  const words = instructions.trim()
  return words === ""
    ? []
    : [
        {
          text: `The person's instructions for the rebuilt shots, which are added after your words, so do not repeat them: ${words}`,
        },
      ]
}

function framePartsOf(frame: PlanFrame): Record<string, unknown>[] {
  return [
    {
      text: `Shot ${frame.shot.number}, ${shotSecondsOf(frame.shot)} seconds.`,
    },
    { inlineData: { mimeType: frame.mime, data: frame.base64 } },
  ]
}

export function planTurnBodyOf(input: PlanTurnInput): Record<string, unknown> {
  return {
    systemInstruction: { parts: [{ text: planRules }] },
    contents: [
      {
        role: "user",
        parts: [
          ...input.frames.flatMap(framePartsOf),
          ...instructionsPart(input.instructions),
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: planOutputTokens,
      responseMimeType: "application/json",
      responseSchema,
    },
  }
}

const planAnswer = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(z.object({ text: z.string().optional() })),
        }),
      })
    )
    .min(1),
})

export function planReplyOf(answer: unknown): unknown {
  const parsed = planAnswer.safeParse(answer)
  const parts = parsed.success
    ? (parsed.data.candidates[0]?.content.parts ?? [])
    : []
  const text = parts.map((part) => part.text ?? "").join("")
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
