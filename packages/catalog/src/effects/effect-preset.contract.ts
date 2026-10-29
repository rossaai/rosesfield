import { choiceValue } from "@rosesfield/contract"
import { z } from "zod"

export const presetKindValues = ["photo", "clip"] as const

const digest = z.string().regex(/^[0-9a-f]{64}$/)

const plainLine = z.string().min(1).max(1600)

export const presetGuide = z.strictObject({
  file: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*\.mp4$/),
  sha256: digest,
  bytes: z.number().int().min(1).max(2_000_000),
  width: z.number().int().min(64),
  height: z.number().int().min(64),
  frames: z.number().int().min(48).max(240),
  fps: z.literal(24),
})

const presetResult = z.strictObject({
  runId: z.uuid(),
  file: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*\.mp4$/),
})

const presetAdapter = z.strictObject({
  file: z.string().regex(/^[\w.-]+\.safetensors$/),
  strength: z.number().min(0).max(2),
})

export const photoPreset = z.strictObject({
  id: choiceValue,
  kind: z.literal("photo"),
  guide: presetGuide,
  prompt: plainLine,
  result: presetResult.nullable(),
})

export const clipPreset = z.strictObject({
  id: choiceValue,
  kind: z.literal("clip"),
  adapter: presetAdapter,
  prompt: plainLine,
  negative: z.string().max(600),
  result: presetResult.nullable(),
})

export const effectPreset = z.discriminatedUnion("kind", [
  photoPreset,
  clipPreset,
])

export const effectPresets = z
  .array(effectPreset)
  .min(1)
  .refine(
    (presets) => new Set(presets.map((one) => one.id)).size === presets.length,
    { message: "Each preset has its own id" }
  )

export type PresetGuide = z.infer<typeof presetGuide>
export type PhotoPreset = z.infer<typeof photoPreset>
export type ClipPreset = z.infer<typeof clipPreset>
export type EffectPreset = z.infer<typeof effectPreset>
export type PresetKind = (typeof presetKindValues)[number]
