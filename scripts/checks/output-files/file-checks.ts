import { facesOfGlb } from "./glb-faces"
import {
  blackFrames,
  decodeErrors,
  loudestDb,
  type Probe,
  probe,
} from "./media-tools"

export type OutputKind = "image" | "video" | "audio" | "mesh"

export type Expected = {
  kind: OutputKind
  ratio?: number
  seconds?: number
}

export type Check = {
  name: string
  pass: boolean
  detail: string
}

const ratioTolerance = 0.02
const secondsTolerance = 0.6
const silentDb = -60

function check(name: string, pass: boolean, detail: string): Check {
  return { name, pass, detail }
}

function visualOf(found: Probe): { width: number; height: number } | null {
  const stream = found.streams.find(
    (one) => one.kind === "video" && one.width !== null && one.height !== null
  )
  return stream === undefined || stream.width === null || stream.height === null
    ? null
    : { width: stream.width, height: stream.height }
}

function sizeCheck(found: Probe, expected: Expected): Check {
  const size = visualOf(found)
  if (size === null) {
    return check("size", false, "no picture stream")
  }
  const detail = `${size.width}x${size.height}`
  if (expected.ratio === undefined) {
    return check("size", size.width > 0 && size.height > 0, detail)
  }
  const ratio = size.width / size.height
  const off = Math.abs(ratio - expected.ratio) / expected.ratio
  return check(
    "size",
    off <= ratioTolerance,
    `${detail}, ratio off by ${(off * 100).toFixed(1)}%`
  )
}

function lengthCheck(found: Probe, expected: Expected): Check | null {
  if (expected.seconds === undefined) {
    return null
  }
  const seconds = found.duration ?? 0
  return check(
    "length",
    Math.abs(seconds - expected.seconds) <= secondsTolerance,
    `${seconds.toFixed(2)} s for ${expected.seconds} s`
  )
}

function formatCheck(found: Probe, kind: OutputKind): Check {
  const kinds = found.streams.map((one) => one.kind)
  const wanted = kind === "audio" ? "audio" : "video"
  return check(
    "format",
    kinds.includes(wanted),
    `${found.format ?? "unknown"}: ${kinds.join(", ")}`
  )
}

async function mediaChecks(path: string, expected: Expected): Promise<Check[]> {
  const found = await probe(path)
  if (found === null) {
    return [check("opens", false, "ffprobe could not read it")]
  }
  const errors = await decodeErrors(path)
  const checks = [
    check(
      "opens",
      errors === "",
      errors === "" ? "decodes whole" : (errors.split("\n")[0] ?? "")
    ),
    formatCheck(found, expected.kind),
  ]
  if (expected.kind !== "audio") {
    checks.push(sizeCheck(found, expected))
  }
  const length = lengthCheck(found, expected)
  if (length !== null) {
    checks.push(length)
  }
  if (expected.kind === "image" || expected.kind === "video") {
    const black = await blackFrames(path)
    checks.push(
      check("no black frame", black === 0, `${black} all-black frames`)
    )
  }
  if (expected.kind === "audio") {
    const loudest = await loudestDb(path)
    const isHeard = loudest !== null && loudest > silentDb
    checks.push(check("not silent", isHeard, `loudest ${loudest ?? "none"} dB`))
  }
  return checks
}

export async function checkOutputFile(
  path: string,
  expected: Expected
): Promise<Check[]> {
  if (expected.kind !== "mesh") {
    return mediaChecks(path, expected)
  }
  const faces = facesOfGlb(new Uint8Array(await Bun.file(path).arrayBuffer()))
  return [
    check(
      "opens",
      faces !== null,
      faces === null ? "not a glTF binary" : "glTF binary"
    ),
    check("has faces", (faces ?? 0) > 0, `${faces ?? 0} faces`),
  ]
}
