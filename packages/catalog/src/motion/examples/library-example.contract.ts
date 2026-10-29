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

export const maxHits = 6

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
    bedGainDb: z.number().int().min(-24).max(0).default(0),
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

const pageTitle = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[^/\\]+$/, {
    message: "A reference page is named by its title, never a path",
  })

export const referencePage = z.strictObject({
  id: choiceValue,
  title: pageTitle,
})

export const fitEdgeValues = ["crop"] as const

export const photoFit = z.strictObject({
  by: z.literal("area"),
  edges: z.enum(fitEdgeValues),
})

export const exampleDesign = z.strictObject({
  unit: referencePage,
  family: referencePage.extend({ id: z.literal("effects") }),
  fit: photoFit,
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

export const exampleProof = z.strictObject({
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

export const exampleRun = z
  .strictObject({
    runId: z.uuid(),
    example: choiceValue,
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

export const exampleLedger = z
  .array(exampleRun)
  .refine(
    (runs) => new Set(runs.map((run) => run.runId)).size === runs.length,
    { message: "Each run is one row of the ledger" }
  )

export const maxPreviewBytes = 8_000_000

export const exampleApproval = z.strictObject({
  question: plainLine,
  words: plainLine,
  date: z.iso.date(),
})

export const guideResolutionValues = ["480p", "720p"] as const

export const heldFile = z.strictObject({
  file: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*\.mp4$/),
  sha256: digest,
  bytes: z.number().int().min(1).max(2_000_000),
})

export const exampleGuide = z.strictObject({
  file: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*\.mp4$/),
  sha256: digest,
  bytes: z.number().int().min(1).max(2_000_000),
  matte: heldFile.nullable().default(null),
  width: z.number().int().min(64),
  height: z.number().int().min(64),
  frames: z.number().int().min(48).max(240),
  fps: z.literal(24),
})

const preview = z.strictObject({
  file: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*\.mp4$/),
  sha256: digest,
  bytes: z.number().int().min(1).max(maxPreviewBytes),
  width: z.number().int().min(64),
  height: z.number().int().min(64),
  runId: z.uuid(),
  seed,
  resolution: z.enum(resolutionValues),
  aspectRatio,
  workflowHash: digest,
  model: z.string().regex(/^[\w.-]+\.safetensors$/),
  credits,
  seconds: z.number().positive(),
  madeAt: z.iso.datetime(),
})

export const libraryExample = z
  .strictObject({
    id: choiceValue,
    approved: z.boolean(),
    approval: exampleApproval.nullable(),
    passed: z.boolean(),
    design: exampleDesign,
    prompt: z.string().min(1).max(1200),
    photoFrame: z.enum(photoFrameValues),
    endFrame,
    midFrame: midFrame.nullable(),
    hold: strength.nullable(),
    adapter: adapter.nullable(),
    seconds: z.number().int().min(4).max(15),
    preview: preview.nullable(),
    proof: exampleProof.nullable(),
    guide: exampleGuide.nullable().default(null),
  })
  .refine(
    (example) =>
      example.photoFrame === "first" || example.endFrame.source !== "none",
    {
      message:
        "An example that lands on the photo opens on its edited frame, so it has one",
      path: ["endFrame"],
    }
  )
  .refine(
    (example) =>
      example.photoFrame === "first" || example.endFrame.source !== "dark",
    {
      message:
        "An example that lands on the photo guides its last frame with the photo, so it takes no dark end frame",
      path: ["endFrame"],
    }
  )
  .refine(
    (example) =>
      example.midFrame === null || example.midFrame.time < example.seconds,
    {
      message: "A designed frame inside the clip comes before its end",
      path: ["midFrame", "time"],
    }
  )
  .refine(
    (example) =>
      example.midFrame === null || example.endFrame.source !== "edit",
    {
      message:
        "The graph has one image edit pass, so an example edits its mid frame or its end frame, not both",
      path: ["midFrame"],
    }
  )
  .refine(
    (example) => example.photoFrame === "first" || example.hold === null,
    {
      message:
        "An example that lands on the photo already guides its last frame with the photo, so it holds no subject",
      path: ["hold"],
    }
  )
  .refine((example) => example.design.unit.id === example.id, {
    message: "An example is designed from its own unit page",
    path: ["design", "unit", "id"],
  })
  .refine((example) => !example.passed || example.preview !== null, {
    message: "A passed example carries the run it passed with",
    path: ["preview"],
  })
  .refine((example) => example.passed === (example.proof !== null), {
    message: "A passed example carries the proof of its run, and only it",
    path: ["proof"],
  })
  .refine((example) => example.approved === (example.approval !== null), {
    message:
      "An approved example carries the maintainer's approval, and only it",
    path: ["approval"],
  })
  .refine((example) => !example.approved || example.preview !== null, {
    message: "An approved example carries the result it was approved on",
    path: ["preview"],
  })
  .refine(
    (example) => example.preview === null || example.passed || example.approved,
    {
      message:
        "An example keeps a result only once a judge passed it or a maintainer approved it",
      path: ["preview"],
    }
  )
  .refine(
    (example) =>
      example.guide === null ||
      (example.photoFrame === "first" &&
        example.endFrame.source === "none" &&
        example.midFrame === null &&
        example.hold === null &&
        example.adapter === null),
    {
      message:
        "An example that follows a guide starts on the photo and its guide sets every frame after it",
      path: ["guide"],
    }
  )
  .refine(
    (example) =>
      example.guide === null ||
      Math.round(example.guide.frames / example.guide.fps) === example.seconds,
    {
      message: "An example that follows a guide lasts as long as its guide",
      path: ["seconds"],
    }
  )

export type EndFrame = z.infer<typeof endFrame>
export type MidFrame = z.infer<typeof midFrame>
export type CutWindow = z.infer<typeof cutWindow>
export type ExampleDesign = z.infer<typeof exampleDesign>
export type ReferencePage = z.infer<typeof referencePage>
export type PhotoFit = z.infer<typeof photoFit>
export type VideoReading = z.infer<typeof videoReading>
export type ExampleProof = z.infer<typeof exampleProof>
export type ExampleRun = z.infer<typeof exampleRun>
export type LibraryExample = z.infer<typeof libraryExample>
export type ExampleGuide = z.infer<typeof exampleGuide>
export type HeldFile = z.infer<typeof heldFile>
export type SoundBed = z.infer<typeof soundBed>
export type ResolutionValue = (typeof resolutionValues)[number]
