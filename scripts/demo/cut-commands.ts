import { siteUrl } from "./demo-args"
import { clipCaption, linkCaption } from "./demo-captions"
import {
  type AppTake,
  builtScenes,
  type Manifest,
  type Media,
  type Scene,
  type SceneId,
  type TourScene,
  tourScenes,
  type Window,
} from "./demo-manifest"

export type Caption = { file: string; text: string; seconds: number }

export type Step = { label: string; args: string[] }

export type Output = {
  file: string
  width: number
  height: number
  maxSeconds: number
}

export type CutPlan = {
  captions: Caption[]
  list: { file: string; text: string }
  steps: Step[]
  outputs: Output[]
  seconds: { video: number; built: number; vertical: number }
}

type Piece = { start: number; seconds: number }

type Size = { width: number; height: number }

export const wide = { width: 1920, height: 1080 }
export const tall = { width: 1080, height: 1920 }
export const videoFile = "rosesfield-demo.mp4"
export const verticalFile = "rosesfield-clip-9x16.mp4"

const maxVideoSeconds = 120
const maxVerticalSeconds = 30
const hookSeconds = 10
const builtTotal = 40
const builtLength = builtTotal / builtScenes.length
const photoSeconds = 3
const resultSeconds = 9
const clipSize = { width: 1280, height: 720 }
const clipSeconds = 6
const canvas = "0x101010"
const order: readonly SceneId[] = [...tourScenes, ...builtScenes]

const tourCaps: Readonly<Record<TourScene, number>> = {
  key: 12,
  areas: 10,
  models: 10,
  run: 12,
  share: 9,
  credits: 7,
}

const wideStyle =
  "FontName=Helvetica Neue,FontSize=14,PrimaryColour=&H00FFFFFF,OutlineColour=&H99000000,BorderStyle=3,Outline=6,Shadow=0,MarginV=24"
const tallStyle =
  "FontName=Helvetica Neue,FontSize=6,PrimaryColour=&H00FFFFFF,OutlineColour=&H99000000,BorderStyle=3,Outline=6,Shadow=0,MarginV=60"

function fixed(seconds: number): string {
  return seconds.toFixed(3)
}

function stampOf(seconds: number): string {
  const ms = Math.round(seconds * 1000)
  const pad = (value: number, size: number): string =>
    String(value).padStart(size, "0")
  return `${pad(Math.floor(ms / 3_600_000), 2)}:${pad(Math.floor(ms / 60_000) % 60, 2)}:${pad(Math.floor(ms / 1000) % 60, 2)},${pad(ms % 1000, 3)}`
}

export function srtOf(caption: Caption): string {
  return `1\n${stampOf(0)} --> ${stampOf(caption.seconds)}\n${caption.text}\n`
}

function fit(size: Size): string {
  return `scale=${size.width}:${size.height}:force_original_aspect_ratio=decrease,pad=${size.width}:${size.height}:(ow-iw)/2:(oh-ih)/2:color=${canvas},setsar=1,fps=30,format=yuv420p`
}

function subtitles(file: string, size: Size): string {
  const style = size.height > size.width ? tallStyle : wideStyle
  return `subtitles=${file}:force_style='${style}'`
}

function encode(isDraft: boolean): string[] {
  return [
    ...["-c:v", "libx264", "-preset", isDraft ? "ultrafast" : "medium"],
    ...["-crf", isDraft ? "30" : "20", "-pix_fmt", "yuv420p", "-r", "30"],
    ...["-an", "-movflags", "+faststart"],
  ]
}

function looped(media: Media, seconds: number): string[] {
  const length = ["-t", fixed(seconds), "-i", media.file]
  return media.kind === "image"
    ? ["-loop", "1", "-framerate", "30", ...length]
    : ["-stream_loop", "-1", ...length]
}

export function piecesOf(windows: readonly Window[], cap: number): Piece[] {
  const pieces: Piece[] = []
  let left = cap
  for (const window of windows) {
    const seconds = Math.min(window.end - window.start, left)
    if (seconds > 0.05) {
      pieces.push({ start: window.start, seconds })
      left -= seconds
    }
  }
  return pieces
}

function scenePieces(scene: Scene): Piece[] {
  const builtScene = builtScenes.find((id) => id === scene.id)
  if (builtScene !== undefined) {
    return [{ start: scene.windows[0]?.start ?? 0, seconds: builtLength }]
  }
  const tourScene = tourScenes.find((id) => id === scene.id)
  return piecesOf(scene.windows, tourScene === undefined ? 0 : tourCaps[tourScene])
}

function orderedScenes(manifest: Manifest): Scene[] {
  return order.map((id) => {
    const scene = manifest.scenes.find((one) => one.id === id)
    if (scene === undefined) {
      throw new Error(`The take has no ${id} scene. Record the take again.`)
    }
    return scene
  })
}

type Segment = { label: string; caption: Caption; step: Step; seconds: number }

function sceneSegments(scene: Scene, index: number, isDraft: boolean): Segment[] {
  return scenePieces(scene).map((piece, part) => {
    const label = `${String(index).padStart(2, "0")}-${scene.id}-${part}`
    const caption = {
      file: `cut/captions/${label}.srt`,
      text: scene.caption,
      seconds: piece.seconds,
    }
    const filter = `${fit(wide)},tpad=stop_mode=clone:stop_duration=${fixed(piece.seconds)},${subtitles(caption.file, wide)}`
    const args = [
      ...["-y", "-v", "error", "-ss", fixed(piece.start), "-i", scene.file],
      ...["-t", fixed(piece.seconds), "-vf", filter],
      ...encode(isDraft),
      `cut/${label}.mp4`,
    ]
    return { label, caption, step: { label, args }, seconds: piece.seconds }
  })
}

function sideBySide(
  take: AppTake,
  input: Media,
  options: { size: Size; seconds: number; caption: Caption; out: string; isDraft: boolean }
): string[] {
  const half = { width: options.size.width / 2, height: options.size.height }
  return [
    ...["-y", "-v", "error"],
    ...looped(input, options.seconds),
    ...looped(take.output, options.seconds),
    "-filter_complex",
    `[0:v]${fit(half)}[a];[1:v]${fit(half)}[b];[a][b]hstack=inputs=2,${subtitles(options.caption.file, options.size)}[v]`,
    ...["-map", "[v]", "-t", fixed(options.seconds)],
    ...encode(options.isDraft),
    options.out,
  ]
}

function hookSegment(manifest: Manifest, isDraft: boolean): Segment {
  const { take, caption: text } = manifest.hook
  if (take.input === null) {
    throw new Error("The take's hook has no input photo.")
  }
  const label = "00-hook"
  const caption = { file: `cut/captions/${label}.srt`, text, seconds: hookSeconds }
  const args = sideBySide(take, take.input, {
    size: wide,
    seconds: hookSeconds,
    caption,
    out: `cut/${label}.mp4`,
    isDraft,
  })
  return { label, caption, step: { label, args }, seconds: hookSeconds }
}

function verticalStep(manifest: Manifest, isDraft: boolean): { step: Step; caption: Caption } {
  const { take } = manifest.hook
  if (manifest.shareUrl === null || take.input === null) {
    throw new Error("The take has no share link, so the clip for the post has no link.")
  }
  const seconds = photoSeconds + resultSeconds
  const caption = { file: "cut/captions/vertical.srt", text: linkCaption(manifest.shareUrl), seconds }
  const args = [
    ...["-y", "-v", "error"],
    ...looped(take.input, photoSeconds),
    ...looped(take.output, resultSeconds),
    "-filter_complex",
    `[0:v]${fit(tall)}[a];[1:v]${fit(tall)}[b];[a][b]concat=n=2:v=1:a=0,${subtitles(caption.file, tall)}[v]`,
    ...["-map", "[v]", "-t", fixed(seconds)],
    ...encode(isDraft),
    verticalFile,
  ]
  return { step: { label: "vertical", args }, caption }
}

function appStep(take: AppTake, isDraft: boolean): { step: Step; caption: Caption; out: string } {
  const out = `apps/${take.appId}.mp4`
  const caption = {
    file: `cut/captions/app-${take.appId}.srt`,
    text: clipCaption(take.appName, take.credits),
    seconds: clipSeconds,
  }
  const options = { size: clipSize, seconds: clipSeconds, caption, out, isDraft }
  const args =
    take.input === null
      ? [
          ...["-y", "-v", "error"],
          ...looped(take.output, clipSeconds),
          ...["-vf", `${fit(clipSize)},${subtitles(caption.file, clipSize)}`],
          ...["-t", fixed(clipSeconds)],
          ...encode(isDraft),
          out,
        ]
      : sideBySide(take, take.input, options)
  return { step: { label: `app-${take.appId}`, args }, caption, out }
}

export function cutPlan(manifest: Manifest, isDraft: boolean): CutPlan {
  const scenes = orderedScenes(manifest)
  const segments = [
    hookSegment(manifest, isDraft),
    ...scenes.flatMap((scene, index) => sceneSegments(scene, index + 1, isDraft)),
  ]
  const vertical = verticalStep(manifest, isDraft)
  const apps = manifest.apps.map((take) => appStep(take, isDraft))
  const video = segments.reduce((sum, one) => sum + one.seconds, 0)
  const built = segments
    .filter((one) => builtScenes.some((id) => one.label.includes(`-${id}-`)))
    .reduce((sum, one) => sum + one.seconds, 0)
  const list = {
    file: "cut/list.txt",
    text: segments.map((one) => `file '${one.label}.mp4'\n`).join(""),
  }
  const joined = {
    label: "video",
    args: [
      ...["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list.file],
      ...["-c", "copy", "-movflags", "+faststart", videoFile],
    ],
  }
  return {
    captions: [...segments.map((one) => one.caption), vertical.caption, ...apps.map((one) => one.caption)],
    list,
    steps: [...segments.map((one) => one.step), joined, vertical.step, ...apps.map((one) => one.step)],
    outputs: [
      { file: videoFile, ...wide, maxSeconds: maxVideoSeconds },
      { file: verticalFile, ...tall, maxSeconds: maxVerticalSeconds },
      ...apps.map((one) => ({ file: one.out, ...clipSize, maxSeconds: clipSeconds + 1 })),
    ],
    seconds: { video, built, vertical: photoSeconds + resultSeconds },
  }
}

export function checkTake(manifest: Manifest, isDraft: boolean): void {
  if (!isDraft && manifest.url !== siteUrl) {
    throw new Error(
      `The take was recorded on ${manifest.url}. The video shows real runs on ${siteUrl}, so record the take there, or cut this one with --draft to check it.`
    )
  }
}

export function checkPlan(plan: CutPlan): void {
  if (plan.seconds.video >= maxVideoSeconds) {
    throw new Error(`The video would run ${plan.seconds.video} seconds, and it must stay under ${maxVideoSeconds}.`)
  }
  if (plan.seconds.built < builtTotal) {
    throw new Error(`The part on how it was built runs ${plan.seconds.built} seconds, and it must fill the last ${builtTotal}.`)
  }
  if (plan.seconds.vertical >= maxVerticalSeconds) {
    throw new Error(`The clip would run ${plan.seconds.vertical} seconds, and it must stay under ${maxVerticalSeconds}.`)
  }
}
