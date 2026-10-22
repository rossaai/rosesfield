export type PreviewSize = {
  width: number
  height: number
}

export type PreviewCanvas = {
  toBlob: (done: (blob: Blob | null) => void, type: string, q: number) => void
}

type Picture = {
  source: CanvasImageSource
  width: number
  height: number
}

export const previewLimits = {
  side: 320,
  bytes: 64 * 1024,
  types: ["image/webp", "image/jpeg"],
  qualities: [0.82, 0.7, 0.55, 0.4],
  frameSeconds: 0.1,
  waitMs: 10_000,
} as const

export function previewSizeOf(width: number, height: number): PreviewSize {
  const scale = Math.min(1, previewLimits.side / Math.max(width, height, 1))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function blobOf(
  canvas: PreviewCanvas,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

export async function encodePreview(
  canvas: PreviewCanvas
): Promise<Blob | null> {
  for (const type of previewLimits.types) {
    for (const quality of previewLimits.qualities) {
      const blob = await blobOf(canvas, type, quality)
      if (blob === null || blob.type !== type) {
        break
      }
      if (blob.size <= previewLimits.bytes) {
        return blob
      }
    }
  }
  return null
}

function settle<Value>(
  start: (resolve: (value: Value | null) => void) => void
): Promise<Value | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), previewLimits.waitMs)
    start((value) => {
      clearTimeout(timer)
      resolve(value)
    })
  })
}

async function imageOf(src: string): Promise<Picture | null> {
  const image = new Image()
  if (typeof image.decode !== "function") {
    return null
  }
  image.src = src
  const isDecoded = await image.decode().then(
    () => true,
    () => false
  )
  return isDecoded
    ? { source: image, width: image.naturalWidth, height: image.naturalHeight }
    : null
}

async function frameOf(src: string): Promise<Picture | null> {
  const video = document.createElement("video")
  video.muted = true
  video.playsInline = true
  video.preload = "auto"
  const frame = settle<Picture>((resolve) => {
    video.addEventListener("error", () => resolve(null), { once: true })
    video.addEventListener(
      "loadedmetadata",
      () => {
        video.currentTime = Math.min(
          previewLimits.frameSeconds,
          video.duration / 2 || 0
        )
      },
      { once: true }
    )
    video.addEventListener(
      "seeked",
      () =>
        resolve({
          source: video,
          width: video.videoWidth,
          height: video.videoHeight,
        }),
      { once: true }
    )
  })
  video.src = src
  const picture = await frame
  if (picture === null) {
    closeVideo(video)
  }
  return picture
}

function closeVideo(video: HTMLVideoElement): void {
  video.removeAttribute("src")
  video.load()
}

function close(picture: Picture | null): void {
  if (picture?.source instanceof HTMLVideoElement) {
    closeVideo(picture.source)
  }
}

export async function makePreview(
  src: string,
  kind: "image" | "video"
): Promise<Blob | null> {
  const picture = kind === "image" ? await imageOf(src) : await frameOf(src)
  try {
    if (picture === null || picture.width === 0 || picture.height === 0) {
      return null
    }
    const size = previewSizeOf(picture.width, picture.height)
    const canvas = document.createElement("canvas")
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext("2d")
    if (context === null) {
      return null
    }
    context.drawImage(picture.source, 0, 0, size.width, size.height)
    return await encodePreview(canvas)
  } finally {
    close(picture)
  }
}
