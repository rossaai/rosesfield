import { type AppClip, appClipOf, clipSize } from "./cut-apps"
import {
  type Caption,
  encode,
  fixed,
  looped,
  type Step,
  scaleToFit,
  sideBySide,
  subtitles,
} from "./cut-filters"
import { repositoryUrl, siteUrl } from "./demo-args"
import { linkCaption } from "./demo-captions"
import {
  builtScenes,
  type Manifest,
  type Scene,
  type SceneId,
  type TourScene,
  tourScenes,
  tourScenesOf,
  type Window,
} from "./demo-manifest"

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

export type CutKind = { isDraft: boolean; isLocal: boolean }

type Piece = { start: number; seconds: number }

type Names = { video: string; vertical: string; suffix: string }

export const wide = { width: 1920, height: 1080 }
export const tall = { width: 1080, height: 1920 }
export const videoFile = "rosesfield-demo.mp4"
export const verticalFile = "rosesfield-clip-9x16.mp4"
export const localVideoFile = "rosesfield-demo-local.mp4"
export const localVerticalFile = "rosesfield-clip-9x16-local.mp4"

const maxVideoSeconds = 120
const maxVerticalSeconds = 30
const hookSeconds = 10
const builtTotal = 40
const builtLength = builtTotal / builtScenes.length
const photoSeconds = 3
const resultSeconds = 9
const loopbackHosts: readonly string[] = ["127.0.0.1", "[::1]", "localhost"]

const tourCaps: Readonly<Record<TourScene, number>> = {
  key: 12,
  areas: 10,
  models: 10,
  run: 12,
  share: 12,
  credits: 7,
}

function namesOf(isLocal: boolean): Names {
  return isLocal
    ? { video: localVideoFile, vertical: localVerticalFile, suffix: "-local" }
    : { video: videoFile, vertical: verticalFile, suffix: "" }
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
  return piecesOf(
    scene.windows,
    tourScene === undefined ? 0 : tourCaps[tourScene]
  )
}

function orderedScenes(manifest: Manifest): Scene[] {
  const order: readonly SceneId[] = [
    ...tourScenesOf(manifest.mode),
    ...builtScenes,
  ]
  return order.map((id) => {
    const scene = manifest.scenes.find((one) => one.id === id)
    if (scene === undefined) {
      throw new Error(`The take has no ${id} scene. Record the take again.`)
    }
    return scene
  })
}

type Segment = { label: string; caption: Caption; step: Step; seconds: number }

function sceneSegments(
  scene: Scene,
  index: number,
  isDraft: boolean
): Segment[] {
  return scenePieces(scene).map((piece, part) => {
    const label = `${String(index).padStart(2, "0")}-${scene.id}-${part}`
    const caption = {
      file: `cut/captions/${label}.srt`,
      text: scene.caption,
      seconds: piece.seconds,
    }
    const filter = `${scaleToFit(wide)},tpad=stop_mode=clone:stop_duration=${fixed(piece.seconds)},${subtitles(caption.file, wide)}`
    const args = [
      ...["-y", "-v", "error", "-ss", fixed(piece.start), "-i", scene.file],
      ...["-t", fixed(piece.seconds), "-vf", filter],
      ...encode(isDraft),
      `cut/${label}.mp4`,
    ]
    return { label, caption, step: { label, args }, seconds: piece.seconds }
  })
}

function hookSegment(manifest: Manifest, isDraft: boolean): Segment {
  const { take, caption: text } = manifest.hook
  if (take.input === null) {
    throw new Error("The take's hook has no input photo.")
  }
  const label = "00-hook"
  const caption = {
    file: `cut/captions/${label}.srt`,
    text,
    seconds: hookSeconds,
  }
  const args = sideBySide(take, take.input, {
    size: wide,
    seconds: hookSeconds,
    caption,
    out: `cut/${label}.mp4`,
    isDraft,
  })
  return { label, caption, step: { label, args }, seconds: hookSeconds }
}

function verticalStep(
  manifest: Manifest,
  kind: CutKind,
  out: string
): { step: Step; caption: Caption } {
  const { take } = manifest.hook
  if (manifest.shareUrl === null || take.input === null) {
    throw new Error(
      "The take has no share link, so the clip for the post has no link."
    )
  }
  const seconds = photoSeconds + resultSeconds
  const caption = {
    file: "cut/captions/vertical.srt",
    text: linkCaption(kind.isLocal ? repositoryUrl : manifest.shareUrl),
    seconds,
  }
  const args = [
    ...["-y", "-v", "error"],
    ...looped(take.input, photoSeconds),
    ...looped(take.output, resultSeconds),
    "-filter_complex",
    `[0:v]${scaleToFit(tall)}[a];[1:v]${scaleToFit(tall)}[b];[a][b]concat=n=2:v=1:a=0,${subtitles(caption.file, tall)}[v]`,
    ...["-map", "[v]", "-t", fixed(seconds)],
    ...encode(kind.isDraft),
    out,
  ]
  return { step: { label: "vertical", args }, caption }
}

export function cutPlan(manifest: Manifest, kind: CutKind): CutPlan {
  const { isDraft } = kind
  const names = namesOf(kind.isLocal)
  const scenes = orderedScenes(manifest)
  const segments = [
    hookSegment(manifest, isDraft),
    ...scenes.flatMap((scene, index) =>
      sceneSegments(scene, index + 1, isDraft)
    ),
  ]
  const vertical = verticalStep(manifest, kind, names.vertical)
  const apps: AppClip[] = manifest.apps.map((take) =>
    appClipOf(take, { isDraft, suffix: names.suffix })
  )
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
      ...["-c", "copy", "-movflags", "+faststart", names.video],
    ],
  }
  return {
    captions: [
      ...segments.map((one) => one.caption),
      vertical.caption,
      ...apps.map((one) => one.caption),
    ],
    list,
    steps: [
      ...segments.map((one) => one.step),
      joined,
      vertical.step,
      ...apps.map((one) => one.step),
    ],
    outputs: [
      { file: names.video, ...wide, maxSeconds: maxVideoSeconds },
      { file: names.vertical, ...tall, maxSeconds: maxVerticalSeconds },
      ...apps.map((one) => ({
        file: one.out,
        ...clipSize,
        maxSeconds: one.seconds + 1,
      })),
    ],
    seconds: { video, built, vertical: photoSeconds + resultSeconds },
  }
}

function isLoopback(address: string): boolean {
  try {
    return loopbackHosts.includes(new URL(address).hostname)
  } catch {
    return false
  }
}

export function checkTake(manifest: Manifest, kind: CutKind): void {
  if (kind.isLocal) {
    if (manifest.mode !== "owner" || !isLoopback(manifest.url)) {
      throw new Error(
        `--local cuts an owner take recorded on this machine, and this take was recorded in ${manifest.mode} mode on ${manifest.url}. Record one with bun run demo:capture --url http://127.0.0.1:<port> --owner.`
      )
    }
    return
  }
  if (!kind.isDraft && manifest.url !== siteUrl) {
    throw new Error(
      `The take was recorded on ${manifest.url}. The video shows real runs on ${siteUrl}, so record the take there, cut an owner take of this machine with --local, or cut this one with --draft to check it.`
    )
  }
}

export function checkPlan(plan: CutPlan): void {
  if (plan.seconds.video >= maxVideoSeconds) {
    throw new Error(
      `The video would run ${plan.seconds.video} seconds, and it must stay under ${maxVideoSeconds}.`
    )
  }
  if (plan.seconds.built < builtTotal) {
    throw new Error(
      `The part on how it was built runs ${plan.seconds.built} seconds, and it must fill the last ${builtTotal}.`
    )
  }
  if (plan.seconds.vertical >= maxVerticalSeconds) {
    throw new Error(
      `The clip would run ${plan.seconds.vertical} seconds, and it must stay under ${maxVerticalSeconds}.`
    )
  }
}
