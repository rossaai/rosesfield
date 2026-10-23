import {
  type Caption,
  encode,
  fixed,
  looped,
  mediaToFit,
  type Step,
  scaleToFit,
  sideBySide,
  subtitles,
} from "./cut-filters"
import { clipCaption } from "./demo-captions"
import type { AppScreen, AppTake } from "./demo-manifest"

export type AppClip = {
  step: Step
  caption: Caption
  out: string
  seconds: number
}

export const clipSize = { width: 1280, height: 720 }

const resultOnlySeconds = 6
const screenSeconds = 4
const resultSeconds = 4.5

function resultFilter(take: AppTake, first: number): string {
  if (take.input === null) {
    return `[${first}:v]${mediaToFit(take.output, clipSize)}[r]`
  }
  const half = { width: clipSize.width / 2, height: clipSize.height }
  return `[${first}:v]${mediaToFit(take.input, half)}[a];[${first + 1}:v]${mediaToFit(take.output, half)}[b];[a][b]hstack=inputs=2[r]`
}

function screenArgs(
  take: AppTake,
  screen: AppScreen,
  clip: { caption: Caption; out: string; isDraft: boolean }
): string[] {
  const start = screen.windows[0]?.start ?? 0
  const media = take.input === null ? [take.output] : [take.input, take.output]
  const seconds = screenSeconds + resultSeconds
  const shown = `[0:v]${scaleToFit(clipSize)},tpad=stop_mode=clone:stop_duration=${fixed(screenSeconds)},trim=duration=${fixed(screenSeconds)},setpts=PTS-STARTPTS[s]`
  return [
    ...["-y", "-v", "error"],
    ...["-ss", fixed(start), "-t", fixed(screenSeconds), "-i", screen.file],
    ...media.flatMap((one) => looped(one, resultSeconds)),
    "-filter_complex",
    `${shown};${resultFilter(take, 1)};[s][r]concat=n=2:v=1:a=0,${subtitles(clip.caption.file, clipSize)}[v]`,
    ...["-map", "[v]", "-t", fixed(seconds)],
    ...encode(clip.isDraft),
    clip.out,
  ]
}

function resultArgs(
  take: AppTake,
  clip: { caption: Caption; out: string; isDraft: boolean }
): string[] {
  if (take.input !== null) {
    return sideBySide(take, take.input, {
      size: clipSize,
      seconds: resultOnlySeconds,
      ...clip,
    })
  }
  return [
    ...["-y", "-v", "error"],
    ...looped(take.output, resultOnlySeconds),
    ...[
      "-vf",
      `${mediaToFit(take.output, clipSize)},${subtitles(clip.caption.file, clipSize)}`,
    ],
    ...["-t", fixed(resultOnlySeconds)],
    ...encode(clip.isDraft),
    clip.out,
  ]
}

export function appClipOf(
  take: AppTake,
  options: { isDraft: boolean; suffix: string }
): AppClip {
  const out = `apps/${take.appId}${options.suffix}.mp4`
  const seconds =
    take.screen === null ? resultOnlySeconds : screenSeconds + resultSeconds
  const caption = {
    file: `cut/captions/app-${take.appId}.srt`,
    text: clipCaption(take.appName, take),
    seconds,
  }
  const clip = { caption, out, isDraft: options.isDraft }
  const args =
    take.screen === null
      ? resultArgs(take, clip)
      : screenArgs(take, take.screen, clip)
  return { step: { label: `app-${take.appId}`, args }, caption, out, seconds }
}
