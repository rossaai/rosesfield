export type VideoResolution = "480p" | "720p"
export type VideoAspect = "1:1" | "4:3" | "3:4" | "16:9" | "9:16"

export type FrameSize = {
  width: number
  height: number
}

export const videoAspects: readonly VideoAspect[] = [
  "1:1",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
]

export const videoLengths: readonly number[] = [2, 3, 4, 5]

export const ltxFramesPerSecond = 24

export const ltxSizes: Readonly<
  Record<VideoResolution, Record<VideoAspect, FrameSize>>
> = {
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
}

export function framesFor(seconds: number): number {
  return ltxFramesPerSecond * seconds + 1
}
