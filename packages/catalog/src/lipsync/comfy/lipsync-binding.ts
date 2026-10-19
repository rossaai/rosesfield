import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { clipBinding } from "#lipsync/comfy/clip-workflow"
import { photoBinding } from "#lipsync/comfy/photo-workflow"

export const lipsyncModes = ["photo", "clip"] as const

export type LipsyncMode = (typeof lipsyncModes)[number]

export const lipsyncBinding: EngineBinding = selectBinding({
  input: "mode",
  options: { photo: photoBinding, clip: clipBinding },
})
