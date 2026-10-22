export const editModel = "byteplus/dreamina-seedance-2-5-260628"

export const extendModel = "ltx-2-5"

export const reframeModel = "ltx-2-3-outpaint"

export const backgroundModel = "birefnet"

export const frameRateModel = "film"

export const videoEditTasks: readonly string[] = ["video-edit", "background"]

export const videoEditModes = [
  "edit",
  "extend",
  "reframe",
  "background",
  "frame-rate",
] as const

export type VideoEditMode = (typeof videoEditModes)[number]

export const graphModes: readonly VideoEditMode[] = [
  "extend",
  "reframe",
  "background",
  "frame-rate",
]

export const modeModels: Readonly<Record<VideoEditMode, string>> = {
  edit: editModel,
  extend: extendModel,
  reframe: reframeModel,
  background: backgroundModel,
  "frame-rate": frameRateModel,
}
