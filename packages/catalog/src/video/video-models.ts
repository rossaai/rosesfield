export const graphModel = "ltx-2-5"

export const hostedModel = "minimax/minimax-h3"

export const defaultModel = graphModel

export const videoTasks: readonly string[] = [
  "text-to-video",
  "image-to-video",
  "reference-to-video",
  "first-last-frame",
]

export const referenceModel = "byteplus/dreamina-seedance-2-5-260628"

export const taskDefaults: Readonly<Record<string, readonly string[]>> = {
  "text-to-video": [graphModel],
  "image-to-video": [graphModel],
  "reference-to-video": [graphModel, referenceModel],
  "first-last-frame": [graphModel],
}

export const extendApp = "video-edit"
