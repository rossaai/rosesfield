export type VideoModel = "ltx-2-5" | "wan-2-2"
export type VideoResolution = "480p" | "720p"
export type VideoAspect = "1:1" | "4:3" | "3:4" | "16:9" | "9:16"

export type FrameSize = {
  width: number
  height: number
}

type ModelFacts = {
  sizeStep: number
  framesPerSecond: number
  sizes: Partial<Record<VideoResolution, Record<VideoAspect, FrameSize>>>
}

export const videoAspects: readonly VideoAspect[] = [
  "1:1",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
]

export const videoLengths: readonly number[] = [2, 3, 4, 5]

export const videoModels: Readonly<Record<VideoModel, ModelFacts>> = {
  "ltx-2-5": {
    sizeStep: 64,
    framesPerSecond: 24,
    sizes: {
      "480p": {
        "1:1": { width: 512, height: 512 },
        "4:3": { width: 768, height: 576 },
        "3:4": { width: 576, height: 768 },
        "16:9": { width: 896, height: 512 },
        "9:16": { width: 512, height: 896 },
      },
      "720p": {
        "1:1": { width: 704, height: 704 },
        "4:3": { width: 1024, height: 768 },
        "3:4": { width: 768, height: 1024 },
        "16:9": { width: 1344, height: 768 },
        "9:16": { width: 768, height: 1344 },
      },
    },
  },
  "wan-2-2": {
    sizeStep: 16,
    framesPerSecond: 16,
    sizes: {
      "480p": {
        "1:1": { width: 480, height: 480 },
        "4:3": { width: 640, height: 480 },
        "3:4": { width: 480, height: 640 },
        "16:9": { width: 848, height: 480 },
        "9:16": { width: 480, height: 848 },
      },
    },
  },
}

export function framesFor(model: VideoModel, seconds: number): number {
  return videoModels[model].framesPerSecond * seconds + 1
}

export function sizesFor(
  model: VideoModel,
  resolution: VideoResolution
): Record<VideoAspect, FrameSize> | null {
  return videoModels[model].sizes[resolution] ?? null
}
