import {
  type FoundShot,
  remakeLimits,
  shotFramesOf,
  startFrameOf,
} from "#remake/shot-plan"

export type JoinShot = {
  shot: FoundShot
  made: string | null
}

export type JoinInput = {
  reference: string
  shots: readonly JoinShot[]
  width: number
  height: number
  sound: "on" | "off"
  output: string
}

const fps = remakeLimits.framesPerSecond

function evenOf(side: number): number {
  return Math.max(2, Math.round(side / 2) * 2)
}

function fitOf(width: number, height: number): string {
  return `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1`
}

function shotFilterOf(
  one: JoinShot,
  index: number,
  input: number | null,
  fit: string
): string {
  const frames = shotFramesOf(one.shot)
  const label = `[v${index}]`
  if (input === null) {
    const start = startFrameOf(one.shot)
    return `[0:v]fps=${fps},trim=start_frame=${start}:end_frame=${start + frames},setpts=PTS-STARTPTS,${fit}${label}`
  }
  return `[${input}:v]fps=${fps},tpad=stop_mode=clone:stop=${frames},trim=end_frame=${frames},setpts=PTS-STARTPTS,${fit}${label}`
}

function inputsOf(shots: readonly JoinShot[]): (number | null)[] {
  let next = 1
  return shots.map((one) => {
    if (one.made === null) {
      return null
    }
    const input = next
    next += 1
    return input
  })
}

function soundFilterOf(shots: readonly JoinShot[]): string {
  const first = shots[0]
  const last = shots.at(-1)
  const start = first === undefined ? 0 : startFrameOf(first.shot) / fps
  const end =
    last === undefined
      ? start
      : (startFrameOf(last.shot) + shotFramesOf(last.shot)) / fps
  return `[0:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS[a]`
}

export function joinArgsOf(input: JoinInput): string[] {
  const fit = fitOf(evenOf(input.width), evenOf(input.height))
  const inputs = inputsOf(input.shots)
  const shotFilters = input.shots.map((one, index) =>
    shotFilterOf(one, index, inputs[index] ?? null, fit)
  )
  const labels = input.shots.map((_, index) => `[v${index}]`).join("")
  const joined = `${labels}concat=n=${input.shots.length}:v=1:a=0[v]`
  const isSounded = input.sound === "on"
  const filters = [
    ...shotFilters,
    joined,
    ...(isSounded ? [soundFilterOf(input.shots)] : []),
  ]
  const made = input.shots.flatMap((one) =>
    one.made === null ? [] : ["-i", one.made]
  )
  return [
    "ffmpeg",
    "-hide_banner",
    "-nostats",
    "-v",
    "error",
    "-y",
    "-i",
    input.reference,
    ...made,
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[v]",
    ...(isSounded ? ["-map", "[a]", "-c:a", "aac"] : ["-an"]),
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
