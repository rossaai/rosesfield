export type ClipPart =
  | { kind: "image"; src: string }
  | { kind: "video"; src: string }
  | { kind: "text"; text: string }

export type ClipPlan = {
  input: ClipPart
  result: ClipPart
}

export type Clip = {
  blob: Blob
  mime: string
  seconds: number
}

export type ClipColors = {
  ground: string
  ink: string
  font: string
}

export const clipSize = { width: 720, height: 1280 }
export const clipTimes = {
  inputSeconds: 2.5,
  imageSeconds: 4,
  videoMaxSeconds: 11,
  limitSeconds: 15,
  framesPerSecond: 30,
}

const recorderTypes: readonly string[] = [
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm",
]

export function recorderType(
  isSupported: (type: string) => boolean
): string | null {
  return recorderTypes.find(isSupported) ?? null
}

export function resultSeconds(part: ClipPart, duration: number | null): number {
  if (part.kind !== "video") {
    return clipTimes.imageSeconds
  }
  const length = duration ?? clipTimes.videoMaxSeconds
  return Math.min(Math.max(length, 1), clipTimes.videoMaxSeconds)
}

export function clipSeconds(plan: ClipPlan, duration: number | null): number {
  return clipTimes.inputSeconds + resultSeconds(plan.result, duration)
}

type Frame = CanvasImageSource & { width?: number; height?: number }

function sizeOfFrame(frame: Frame): { width: number; height: number } {
  if (frame instanceof HTMLVideoElement) {
    return { width: frame.videoWidth, height: frame.videoHeight }
  }
  if (frame instanceof HTMLImageElement) {
    return { width: frame.naturalWidth, height: frame.naturalHeight }
  }
  return { width: frame.width ?? 1, height: frame.height ?? 1 }
}

export function fitRect(
  source: { width: number; height: number },
  box: { width: number; height: number },
  mode: "cover" | "contain"
): { x: number; y: number; width: number; height: number } {
  const ratio =
    mode === "cover"
      ? Math.max(box.width / source.width, box.height / source.height)
      : Math.min(box.width / source.width, box.height / source.height)
  const width = source.width * ratio
  const height = source.height * ratio
  return {
    x: (box.width - width) / 2,
    y: (box.height - height) / 2,
    width,
    height,
  }
}

function paint(
  context: CanvasRenderingContext2D,
  frame: Frame,
  colors: ClipColors,
  mode: "cover" | "contain"
): void {
  context.fillStyle = colors.ground
  context.fillRect(0, 0, clipSize.width, clipSize.height)
  const rect = fitRect(sizeOfFrame(frame), clipSize, mode)
  context.drawImage(frame, rect.x, rect.y, rect.width, rect.height)
}

function wrapped(
  context: CanvasRenderingContext2D,
  text: string,
  width: number
): string[] {
  const lines: string[] = []
  let line = ""
  for (const word of text.split(/\s+/)) {
    const next = line === "" ? word : `${line} ${word}`
    if (context.measureText(next).width > width && line !== "") {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  return line === "" ? lines : [...lines, line]
}

function paintText(
  context: CanvasRenderingContext2D,
  text: string,
  colors: ClipColors
): void {
  const size = 44
  const inset = 64
  context.fillStyle = colors.ground
  context.fillRect(0, 0, clipSize.width, clipSize.height)
  context.fillStyle = colors.ink
  context.font = `500 ${size}px ${colors.font}`
  context.textBaseline = "top"
  const lines = wrapped(context, text, clipSize.width - inset * 2).slice(0, 12)
  const top = (clipSize.height - lines.length * size * 1.3) / 2
  lines.forEach((line, index) => {
    context.fillText(line, inset, top + index * size * 1.3)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image()
  image.src = src
  return image.decode().then(() => image)
}

async function loadVideo(src: string): Promise<HTMLVideoElement> {
  const video = document.createElement("video")
  video.muted = true
  video.playsInline = true
  video.src = src
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve()
    video.onerror = () => reject(new Error("The video did not load"))
  })
  return video
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function framesFor(part: ClipPart): Promise<{
  draw: (context: CanvasRenderingContext2D, colors: ClipColors) => void
  stop: () => void
}> {
  if (part.kind === "text") {
    return {
      draw: (context, colors) => paintText(context, part.text, colors),
      stop: () => undefined,
    }
  }
  if (part.kind === "image") {
    const image = await loadImage(part.src)
    return {
      draw: (context, colors) => paint(context, image, colors, "contain"),
      stop: () => undefined,
    }
  }
  const video = await loadVideo(part.src)
  await video.play()
  return {
    draw: (context, colors) => paint(context, video, colors, "contain"),
    stop: () => video.pause(),
  }
}

async function holdPart(
  context: CanvasRenderingContext2D,
  part: ClipPart,
  colors: ClipColors,
  seconds: number
): Promise<void> {
  const frames = await framesFor(part)
  const until = performance.now() + seconds * 1000
  while (performance.now() < until) {
    frames.draw(context, colors)
    await wait(1000 / clipTimes.framesPerSecond)
  }
  frames.stop()
}

async function videoDuration(part: ClipPart): Promise<number | null> {
  if (part.kind !== "video") {
    return null
  }
  const video = await loadVideo(part.src)
  return Number.isFinite(video.duration) ? video.duration : null
}

export async function makeClip(
  plan: ClipPlan,
  colors: ClipColors
): Promise<Clip> {
  const type = recorderType((one) => MediaRecorder.isTypeSupported(one))
  if (type === null) {
    throw new Error("This browser records no video")
  }
  const canvas = document.createElement("canvas")
  canvas.width = clipSize.width
  canvas.height = clipSize.height
  const context = canvas.getContext("2d")
  if (context === null) {
    throw new Error("This browser draws no canvas")
  }
  const duration = await videoDuration(plan.result)
  const stream = canvas.captureStream(clipTimes.framesPerSecond)
  const recorder = new MediaRecorder(stream, { mimeType: type })
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => chunks.push(event.data)
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve()
  })
  paintText(context, "", colors)
  recorder.start()
  const started = performance.now()
  await holdPart(context, plan.input, colors, clipTimes.inputSeconds)
  await holdPart(
    context,
    plan.result,
    colors,
    resultSeconds(plan.result, duration)
  )
  recorder.stop()
  await stopped
  const mime = type.split(";")[0] ?? type
  return {
    blob: new Blob(chunks, { type: mime }),
    mime,
    seconds: (performance.now() - started) / 1000,
  }
}
