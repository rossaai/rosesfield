import type { AppTake, Media } from "./demo-manifest"

export type Caption = { file: string; text: string; seconds: number }

export type Step = { label: string; args: string[] }

export type Size = { width: number; height: number }

const canvas = "0x101010"

const wideStyle =
  "FontName=Helvetica Neue,FontSize=14,PrimaryColour=&H00FFFFFF,OutlineColour=&H99000000,BorderStyle=3,Outline=6,Shadow=0,MarginV=24"
const tallStyle =
  "FontName=Helvetica Neue,FontSize=6,PrimaryColour=&H00FFFFFF,OutlineColour=&H99000000,BorderStyle=3,Outline=6,Shadow=0,MarginV=60"

export function fixed(seconds: number): string {
  return seconds.toFixed(3)
}

export function scaleToFit(size: Size): string {
  return `scale=${size.width}:${size.height}:force_original_aspect_ratio=decrease,pad=${size.width}:${size.height}:(ow-iw)/2:(oh-ih)/2:color=${canvas},setsar=1,fps=30,format=yuv420p`
}

export function subtitles(file: string, size: Size): string {
  const style = size.height > size.width ? tallStyle : wideStyle
  return `subtitles=${file}:force_style='${style}'`
}

export function encode(isDraft: boolean): string[] {
  return [
    ...["-c:v", "libx264", "-preset", isDraft ? "ultrafast" : "medium"],
    ...["-crf", isDraft ? "30" : "20", "-pix_fmt", "yuv420p", "-r", "30"],
    ...["-an", "-movflags", "+faststart"],
  ]
}

export function looped(media: Media, seconds: number): string[] {
  const length = ["-t", fixed(seconds), "-i", media.file]
  return media.kind === "image"
    ? ["-loop", "1", "-framerate", "30", ...length]
    : ["-stream_loop", "-1", ...length]
}

export function sideBySide(
  take: AppTake,
  input: Media,
  options: {
    size: Size
    seconds: number
    caption: Caption
    out: string
    isDraft: boolean
  }
): string[] {
  const half = { width: options.size.width / 2, height: options.size.height }
  return [
    ...["-y", "-v", "error"],
    ...looped(input, options.seconds),
    ...looped(take.output, options.seconds),
    "-filter_complex",
    `[0:v]${scaleToFit(half)}[a];[1:v]${scaleToFit(half)}[b];[a][b]hstack=inputs=2,${subtitles(options.caption.file, options.size)}[v]`,
    ...["-map", "[v]", "-t", fixed(options.seconds)],
    ...encode(options.isDraft),
    options.out,
  ]
}
