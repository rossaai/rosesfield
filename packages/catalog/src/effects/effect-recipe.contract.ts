import { aspectRatio, choiceValue, seed } from "@rosesfield/contract"
import { z } from "zod"

export const resolutionValues = ["480p", "720p"] as const

const strength = z.number().min(0).max(1)

const endFramePrompt = z.string().min(1).max(600)

export const endFrame = z.discriminatedUnion("source", [
  z.strictObject({ source: z.literal("none") }),
  z.strictObject({
    source: z.literal("edit"),
    prompt: endFramePrompt,
    strength,
  }),
  z.strictObject({
    source: z.literal("draw"),
    prompt: endFramePrompt,
    strength,
  }),
])

const adapter = z.strictObject({
  file: z.string().regex(/^[\w.-]+\.safetensors$/),
  strength: z.number().min(0).max(2),
})

const measured = z
  .strictObject({ credits: z.number().positive(), runId: z.uuid() })
  .nullable()

const preview = z.strictObject({
  file: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*\.mp4$/),
  runId: z.uuid(),
  seed,
  resolution: z.enum(resolutionValues),
  aspectRatio,
  workflowHash: z.string().regex(/^[0-9a-f]{64}$/),
})

export const effectRecipe = z
  .strictObject({
    effect: choiceValue,
    review: z.enum(["candidate", "control", "passed"]),
    prompt: z.string().max(1200),
    endFrame,
    hold: strength.nullable(),
    adapter: adapter.nullable(),
    seconds: z.number().int().min(3).max(8),
    credits: z.strictObject({ "480p": measured, "720p": measured }),
    preview: preview.nullable(),
  })
  .refine((recipe) => recipe.review === "control" || recipe.prompt !== "", {
    message: "Only a control runs with no effect prompt",
    path: ["prompt"],
  })
  .refine(
    (recipe) => (recipe.review === "passed") === (recipe.preview !== null),
    {
      message: "A passed effect carries the run it passed with, and only it",
      path: ["preview"],
    }
  )

export type EndFrame = z.infer<typeof endFrame>
export type EffectRecipe = z.infer<typeof effectRecipe>
export type ResolutionValue = (typeof resolutionValues)[number]
