export const graphModel = "ltx-2-3"

export const clipModel = "byteplus/dreamina-seedance-2-5-260628"

export const defaultModel = graphModel

export const lipsyncTasks: readonly string[] = ["lip-sync"]

export const lipsyncModes = ["photo", "clip"] as const

export type LipsyncMode = (typeof lipsyncModes)[number]

export const modeDefaults: Readonly<Record<LipsyncMode, string>> = {
  photo: graphModel,
  clip: clipModel,
}
