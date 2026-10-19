export type ToolResult = {
  code: number
  stdout: string
  stderr: string
}

export async function runTool(args: readonly string[]): Promise<ToolResult> {
  const process = Bun.spawn([...args], { stdout: "pipe", stderr: "pipe" })
  const [stdout, stderr, code] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ])
  return { code, stdout, stderr }
}

export type Probe = {
  streams: { kind: string; width: number | null; height: number | null }[]
  duration: number | null
  format: string | null
}

function numberOf(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null
}

function recordOf(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {}
}

export async function probe(path: string): Promise<Probe | null> {
  const result = await runTool([
    "ffprobe",
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_streams",
    "-show_format",
    path,
  ])
  if (result.code !== 0) {
    return null
  }
  const body = recordOf(JSON.parse(result.stdout))
  const streams = Array.isArray(body.streams) ? body.streams : []
  const format = recordOf(body.format)
  return {
    streams: streams.map((one) => {
      const stream = recordOf(one)
      return {
        kind: String(stream.codec_type ?? ""),
        width: numberOf(stream.width),
        height: numberOf(stream.height),
      }
    }),
    duration: numberOf(format.duration),
    format: typeof format.format_name === "string" ? format.format_name : null,
  }
}

export async function decodeErrors(path: string): Promise<string> {
  const result = await runTool([
    "ffmpeg",
    "-v",
    "error",
    "-i",
    path,
    "-f",
    "null",
    "-",
  ])
  return result.code === 0
    ? result.stderr.trim()
    : result.stderr.trim() || "ffmpeg failed"
}

export async function blackFrames(path: string): Promise<number> {
  const result = await runTool([
    "ffmpeg",
    "-hide_banner",
    "-i",
    path,
    "-vf",
    "blackframe=amount=98:threshold=24",
    "-an",
    "-f",
    "null",
    "-",
  ])
  return (result.stderr.match(/\[Parsed_blackframe[^\]]*\] frame:/g) ?? [])
    .length
}

export async function loudestDb(path: string): Promise<number | null> {
  const result = await runTool([
    "ffmpeg",
    "-hide_banner",
    "-i",
    path,
    "-af",
    "volumedetect",
    "-vn",
    "-f",
    "null",
    "-",
  ])
  const found = /max_volume:\s*(-?[\d.]+|-inf) dB/.exec(result.stderr)
  if (found === null) {
    return null
  }
  return found[1] === "-inf" ? Number.NEGATIVE_INFINITY : Number(found[1])
}
