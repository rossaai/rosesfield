import { clipPlanLimits } from "@rosesfield/catalog/motion"
import { routes } from "@rosesfield/contract"
import { callRoute } from "@/api/call-route"
import { uploadAsset } from "@/api/upload-asset"
import { assetContentPath } from "@/api/use-asset-source"
import { sendsCredentials } from "@/api/visitor-keys"

export type FrameSize = { width: number; height: number }

/** Takes the frames the plan reads from your video and keeps them held, returning their ids. */
export type ClipFramesOf = (clip: string) => Promise<string[]>

/** Reads the text of a file a step held. */
export type HeldTextOf = (assetId: string) => Promise<string>

export const planFrameSide = 512

const frameQuality = 0.9

const lastFrameMargin = 0.05

const seekLimitMs = 20_000

/** The first frame, two in the middle and the last, in seconds. */
export function frameTimesOf(seconds: number): number[] {
  const last = Math.max(0, seconds - lastFrameMargin)
  const count = clipPlanLimits.frames
  return Array.from({ length: count }, (_, at) => (last * at) / (count - 1))
}

/** The size of a frame the plan reads: the video's own shape, its long side at most 512 px. */
export function planFrameSizeOf(video: FrameSize): FrameSize {
  const long = Math.max(video.width, video.height)
  const scale = long > planFrameSide ? planFrameSide / long : 1
  return {
    width: Math.max(1, Math.round(video.width * scale)),
    height: Math.max(1, Math.round(video.height * scale)),
  }
}

async function sourceOf(clip: string): Promise<string> {
  if (!sendsCredentials()) {
    return assetContentPath(clip)
  }
  const link = await callRoute(routes.linkAssetContent, {
    params: { assetId: clip },
  })
  return link.url
}

function settled(video: HTMLVideoElement, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`The video gave no ${event}`)),
      seekLimitMs
    )
    video.addEventListener(
      event,
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true }
    )
    video.addEventListener(
      "error",
      () => {
        clearTimeout(timer)
        reject(new Error("The browser cannot open the video"))
      },
      { once: true }
    )
  })
}

function frameOf(video: HTMLVideoElement, size: FrameSize): Promise<Blob> {
  const canvas = document.createElement("canvas")
  canvas.width = size.width
  canvas.height = size.height
  canvas.getContext("2d")?.drawImage(video, 0, 0, size.width, size.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob === null ? reject(new Error("No frame was drawn")) : resolve(blob),
      "image/jpeg",
      frameQuality
    )
  )
}

/** Draws the 4 frames in this browser and uploads each held, so none of them reaches your library. */
export const browserClipFrames: ClipFramesOf = async (clip) => {
  const video = document.createElement("video")
  video.muted = true
  video.preload = "auto"
  video.crossOrigin = "anonymous"
  const loaded = settled(video, "loadeddata")
  video.src = await sourceOf(clip)
  await loaded
  const size = planFrameSizeOf({
    width: video.videoWidth,
    height: video.videoHeight,
  })
  const blobs: Blob[] = []
  for (const time of frameTimesOf(video.duration)) {
    const seeked = settled(video, "seeked")
    video.currentTime = time
    await seeked
    blobs.push(await frameOf(video, size))
  }
  video.removeAttribute("src")
  const kept = await Promise.all(
    blobs.map((file) =>
      uploadAsset({ file, onProgress: () => undefined, place: "held" })
    )
  )
  return kept.map((asset) => asset.id)
}

export const gatewayHeldText: HeldTextOf = async (assetId) => {
  const blob = await callRoute(routes.readAssetContent, {
    params: { assetId },
  })
  return blob.text()
}
