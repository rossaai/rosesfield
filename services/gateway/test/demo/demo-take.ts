import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect } from "vitest"

const command = fileURLToPath(
  new URL("../../../../scripts/demo/cut.ts", import.meta.url)
)

export const shareUrl = "https://rosesfield.com/share/Zq3Ftb8mVwq1J0aXrN4u2A"
const sceneOrder = [
  "key",
  "areas",
  "models",
  "run",
  "share",
  "credits",
  "router",
  "cloud",
  "catalog",
  "graph",
  "proof",
]

export const take = {
  appId: "effects",
  appName: "Effects",
  runId: "2d8e5b6a-3f4c-4e7d-9a0b-9c8d7e6f5a4b",
  input: { file: "media/photo.png", kind: "image" },
  output: { file: "media/result.mp4", kind: "video" },
  credits: 37.9,
}

export const scenes = sceneOrder.map((id) => ({
  id,
  file: "screens/scene.webm",
  windows: [{ start: 0.5, end: 3 }],
  caption:
    id === "graph"
      ? "Effects runs one LTX 2.5 graph, effects-ltx-2-5, on Comfy Cloud."
      : `The ${id} scene.`,
}))

export function manifest(
  changes: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    url: "https://rosesfield.com",
    recordedAt: "2026-10-22T12:00:00.000Z",
    hook: {
      take,
      caption: "Your photo, then the video one Effects run made from it.",
    },
    scenes,
    shareUrl,
    apps: [take],
    credits: { budget: 200, live: [], proofRuns: 12, proofCredits: 455.2 },
    ...changes,
  }
}

export async function ffmpeg(cwd: string, args: string[]): Promise<void> {
  const done = Bun.spawn(["ffmpeg", "-y", "-v", "error", ...args], { cwd })
  expect(await done.exited).toBe(0)
}

export async function probe(
  file: string
): Promise<{ width: number; height: number; seconds: number }> {
  const done = Bun.spawn(
    [
      "ffprobe",
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height:format=duration",
      "-of",
      "json",
      file,
    ],
    { stdout: "pipe" }
  )
  const body = JSON.parse(await new Response(done.stdout).text())
  return {
    width: body.streams[0].width,
    height: body.streams[0].height,
    seconds: Number(body.format.duration),
  }
}

export async function pixelAt(
  file: string,
  second: number,
  at: { x: number; y: number }
): Promise<number[]> {
  const done = Bun.spawn(
    [
      ...["ffmpeg", "-v", "error", "-ss", String(second), "-i", file],
      ...["-frames:v", "1", "-vf", `format=rgb24,crop=1:1:${at.x}:${at.y}`],
      ...["-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
    ],
    { stdout: "pipe" }
  )
  return [...new Uint8Array(await new Response(done.stdout).arrayBuffer())]
}

export async function cut(
  folder: string,
  ...args: string[]
): Promise<{ code: number; out: string; error: string }> {
  const done = Bun.spawn(["bun", command, "--take", folder, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const [out, error, code] = await Promise.all([
    new Response(done.stdout).text(),
    new Response(done.stderr).text(),
    done.exited,
  ])
  return { code, out, error }
}

export async function writeTake(
  folder: string,
  body: Record<string, unknown>
): Promise<void> {
  await Bun.write(join(folder, "manifest.json"), JSON.stringify(body))
}

export async function makeMedia(at: string): Promise<void> {
  await mkdir(join(at, "screens"))
  await mkdir(join(at, "media"))
  await Promise.all([
    ffmpeg(at, [
      "-f",
      "lavfi",
      "-i",
      "testsrc=size=640x360:rate=30",
      "-t",
      "3",
      "-c:v",
      "libvpx",
      "-b:v",
      "200k",
      "screens/scene.webm",
    ]),
    ffmpeg(at, [
      "-f",
      "lavfi",
      "-i",
      "color=c=0x884422:size=480x640",
      "-frames:v",
      "1",
      "media/photo.png",
    ]),
    ffmpeg(at, [
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=480x640:rate=30",
      "-t",
      "2",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "media/result.mp4",
    ]),
  ])
}

export const localUrl = "http://127.0.0.1:8788"
export const ownerTake = {
  ...take,
  model: "Flux 2 Pro",
  screen: { file: "screens/scene.webm", windows: [{ start: 0.5, end: 3 }] },
}

export function ownerManifest(
  changes: Record<string, unknown> = {}
): Record<string, unknown> {
  return manifest({
    url: localUrl,
    mode: "owner",
    scenes: scenes.filter((scene) => scene.id !== "key"),
    shareUrl: `${localUrl}/share/Zq3Ftb8mVwq1J0aXrN4u2A`,
    apps: [ownerTake],
    ...changes,
  })
}
