import { aspectRatio, choiceValue, seed } from "@rosesfield/contract"
import { z } from "zod"

export const resolutionValues = ["480p", "720p", "1080p"] as const

export const minimumBalance = 2000

const strength = z.number().min(0).max(1)

export const maxGrain = 0.02

export const defaultGrain = 0.004

const plainLine = z.string().min(1).max(600)

export const endFrame = z.discriminatedUnion("source", [
  z.strictObject({ source: z.literal("none") }),
  z.strictObject({
    source: z.literal("edit"),
    prompt: plainLine,
    strength,
  }),
  z.strictObject({
    source: z.literal("dark"),
    luma: z.number().int().min(0).max(40),
    strength,
  }),
])

export const midFrame = z.strictObject({
  source: z.literal("edit"),
  prompt: plainLine,
  time: z.number().positive().max(15),
  strength,
})

const adapter = z.strictObject({
  file: z.string().regex(/^[\w.-]+\.safetensors$/),
  strength: z.number().min(0).max(2),
})

const seconds = z.number().min(0).max(15)

export const cutWindow = z
  .strictObject({ min: seconds, max: seconds, kind: z.enum(["cut", "may"]) })
  .refine((window) => window.min <= window.max, {
    message: "A cut window opens before it closes",
  })

const decibels = z.number().min(-70).max(0)

export const maxFadeOut = 2

export const maxHits = 4

export const soundHit = z.strictObject({
  prompt: plainLine,
  time: seconds,
  seconds: z.number().min(0.5).max(5),
  gainDb: z.number().int().min(-24).max(12),
})

export const soundBed = z
  .strictObject({
    prompt: plainLine,
    loudness: z.strictObject({ min: decibels, max: decibels }),
    truePeakMax: decibels,
    fadeOut: z.number().min(0).max(maxFadeOut).multipleOf(0.1).default(0),
    hits: z.array(soundHit).max(maxHits).default([]),
    build: z
      .strictObject({
        seconds: z.number().min(0.5).max(7).multipleOf(0.1),
        floorDb: z.number().int().min(-30).max(0),
      })
      .nullable()
      .default(null),
    brighten: z
      .strictObject({
        presenceDb: z.number().min(0).max(12).multipleOf(0.5),
        airDb: z.number().min(0).max(12).multipleOf(0.5),
      })
      .nullable()
      .default(null),
  })
  .refine((sound) => sound.loudness.min <= sound.loudness.max, {
    message: "A loudness band opens below where it closes",
    path: ["loudness"],
  })

export const effectDesign = z.strictObject({
  unit: choiceValue,
  family: z.literal("effects"),
  setPiece: plainLine,
  cuts: z.array(cutWindow).max(4),
  lastFrame: z.strictObject({
    shows: plainLine,
    maxLuma: z.number().min(0).max(255).nullable(),
  }),
  sound: soundBed.nullable(),
  encode: z.strictObject({
    container: z.literal("mp4"),
    codec: z.literal("h264"),
    bitDepth: z.literal(8),
    grain: z.number().min(0).max(maxGrain).default(defaultGrain),
  }),
})

const loudness = z.strictObject({
  integrated: z.number(),
  truePeak: z.number(),
})

export const videoReading = z.strictObject({
  frames: z.number().int().min(1),
  fps: z.number().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  cuts: z.array(z.number().min(0)),
  loudness: loudness.nullable(),
  firstFrameLuma: z.number().min(0).max(255),
  lastFrameLuma: z.number().min(0).max(255),
})

const credits = z.number().min(0)

const digest = z.string().regex(/^[0-9a-f]{64}$/)

export const effectProof = z.strictObject({
  gate: z.strictObject({
    positives: z.number().int().min(1),
    planted: z.literal("refused"),
    verdict: z.literal("held"),
  }),
  judge: z.strictObject({
    criteria: z.number().int().min(1),
    failed: z.array(z.string().min(1)).max(0),
    verdict: z.literal("held"),
  }),
  reading: videoReading,
})

export const photoFrameValues = ["first", "last"] as const

export const runVerdictValues = ["kept", "refused"] as const

export const effectRun = z
  .strictObject({
    runId: z.uuid(),
    effect: choiceValue,
    workflowHash: digest,
    photo: digest,
    seed,
    resolution: z.enum(resolutionValues),
    aspectRatio,
    balance: z.strictObject({ before: credits, after: credits }),
    verdict: z.enum(runVerdictValues),
    failed: z.array(z.string().min(1)),
  })
  .refine((run) => run.balance.before >= minimumBalance, {
    message: `A run starts only with ${minimumBalance} credits or more`,
    path: ["balance", "before"],
  })
  .refine((run) => run.balance.after >= minimumBalance, {
    message: `A run that took the balance under ${minimumBalance} credits breaks the lane's floor`,
    path: ["balance", "after"],
  })
  .refine((run) => run.balance.after <= run.balance.before, {
    message: "A run's balance after it is at most its balance before it",
    path: ["balance", "after"],
  })
  .refine((run) => (run.verdict === "kept") === (run.failed.length === 0), {
    message:
      "A kept run failed no criterion, and a refused run names the ones it failed",
    path: ["failed"],
  })

export const effectLedger = z
  .array(effectRun)
  .refine(
    (runs) => new Set(runs.map((run) => run.runId)).size === runs.length,
    { message: "Each run is one row of the ledger" }
  )

const preview = z.strictObject({
  file: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*\.mp4$/),
  runId: z.uuid(),
  seed,
  resolution: z.enum(resolutionValues),
  aspectRatio,
  workflowHash: digest,
})

export const effectRecipe = z
  .strictObject({
    effect: choiceValue,
    passed: z.boolean(),
    design: effectDesign,
    prompt: z.string().min(1).max(1200),
    photoFrame: z.enum(photoFrameValues),
    endFrame,
    midFrame: midFrame.nullable(),
    hold: strength.nullable(),
    adapter: adapter.nullable(),
    seconds: z.number().int().min(5).max(15),
    preview: preview.nullable(),
    proof: effectProof.nullable(),
  })
  .refine(
    (recipe) =>
      recipe.photoFrame === "first" || recipe.endFrame.source !== "none",
    {
      message:
        "A look that lands on the photo opens on its edited frame, so it has one",
      path: ["endFrame"],
    }
  )
  .refine(
    (recipe) =>
      recipe.photoFrame === "first" || recipe.endFrame.source !== "dark",
    {
      message:
        "A look that lands on the photo guides its last frame with the photo, so it takes no dark end frame",
      path: ["endFrame"],
    }
  )
  .refine(
    (recipe) =>
      recipe.midFrame === null || recipe.midFrame.time < recipe.seconds,
    {
      message: "A designed frame inside the clip comes before its end",
      path: ["midFrame", "time"],
    }
  )
  .refine(
    (recipe) => recipe.midFrame === null || recipe.endFrame.source !== "edit",
    {
      message:
        "The graph has one image edit pass, so a look edits its mid frame or its end frame, not both",
      path: ["midFrame"],
    }
  )
  .refine((recipe) => recipe.photoFrame === "first" || recipe.hold === null, {
    message:
      "A look that lands on the photo already guides its last frame with the photo, so it holds no subject",
    path: ["hold"],
  })
  .refine((recipe) => recipe.passed === (recipe.preview !== null), {
    message: "A passed effect carries the run it passed with, and only it",
    path: ["preview"],
  })
  .refine((recipe) => recipe.passed === (recipe.proof !== null), {
    message: "A passed effect carries the proof of its run, and only it",
    path: ["proof"],
  })

export type EndFrame = z.infer<typeof endFrame>
export type MidFrame = z.infer<typeof midFrame>
export type CutWindow = z.infer<typeof cutWindow>
export type EffectDesign = z.infer<typeof effectDesign>
export type VideoReading = z.infer<typeof videoReading>
export type EffectProof = z.infer<typeof effectProof>
export type EffectRun = z.infer<typeof effectRun>
export type EffectRecipe = z.infer<typeof effectRecipe>
export type SoundBed = z.infer<typeof soundBed>
export type ResolutionValue = (typeof resolutionValues)[number]
