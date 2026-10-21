import { type SwapPadding, swapPaddingOf } from "#remake/shot-padding"
import {
  type FoundShot,
  remakeLimits,
  shotFramesOf,
  startFrameOf,
} from "#remake/shot-plan"

export type SwapClipInput = {
  reference: string
  shot: FoundShot
  shortestSeconds: number
  output: string
}

const fps = remakeLimits.framesPerSecond

function passesFilterOf(padding: SwapPadding): string {
  if (padding.passes <= 1) {
    return "[shot]null[clip]"
  }
  const labels = Array.from({ length: padding.passes }, (_, pass) => pass)
  const outputs = labels.map((pass) => `[p${pass}]`).join("")
  const split = `[shot]split=${padding.passes}${outputs}`
  const turned = labels.map(
    (pass) => `[p${pass}]${pass % 2 === 1 ? "reverse" : "null"}[q${pass}]`
  )
  const joined = `${labels.map((pass) => `[q${pass}]`).join("")}concat=n=${padding.passes}:v=1:a=0,trim=end_frame=${padding.paddedFrames},setpts=PTS-STARTPTS[clip]`
  return [split, ...turned, joined].join(";")
}

export function swapClipArgsOf(input: SwapClipInput): string[] {
  const start = startFrameOf(input.shot)
  const frames = shotFramesOf(input.shot)
  const padding = swapPaddingOf(frames, input.shortestSeconds)
  const cut = `[0:v]fps=${fps},trim=start_frame=${start}:end_frame=${start + frames},setpts=PTS-STARTPTS[shot]`
  return [
    "ffmpeg",
    "-hide_banner",
    "-nostats",
    "-v",
    "error",
    "-y",
    "-i",
    input.reference,
    "-filter_complex",
    `${cut};${passesFilterOf(padding)}`,
    "-map",
    "[clip]",
    "-an",
    "-r",
    String(fps),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    input.output,
  ]
}
