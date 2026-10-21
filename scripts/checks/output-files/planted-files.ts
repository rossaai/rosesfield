import { join } from "node:path"
import type { Expected } from "./file-checks"
import { runTool } from "./media-tools"

export type Planted = {
  file: string
  expected: Expected
  defect: string | null
}

const wide = 16 / 9

function glbOf(json: Record<string, unknown>, positions: number): Uint8Array {
  const text = new TextEncoder().encode(JSON.stringify(json))
  const jsonLength = Math.ceil(text.length / 4) * 4
  const binLength = positions * 12
  const total = 12 + 8 + jsonLength + (binLength > 0 ? 8 + binLength : 0)
  const bytes = new Uint8Array(total)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, total, true)
  view.setUint32(12, jsonLength, true)
  view.setUint32(16, 0x4e4f534a, true)
  bytes.fill(0x20, 20, 20 + jsonLength)
  bytes.set(text, 20)
  if (binLength > 0) {
    view.setUint32(20 + jsonLength, binLength, true)
    view.setUint32(24 + jsonLength, 0x004e4942, true)
  }
  return bytes
}

function meshJson(positions: number): Record<string, unknown> {
  return {
    asset: { version: "2.0" },
    buffers: positions > 0 ? [{ byteLength: positions * 12 }] : [],
    bufferViews:
      positions > 0 ? [{ buffer: 0, byteLength: positions * 12 }] : [],
    accessors: [
      { bufferView: 0, componentType: 5126, count: positions, type: "VEC3" },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, mode: 4 }] }],
  }
}

async function ffmpeg(args: readonly string[]): Promise<void> {
  const result = await runTool(["ffmpeg", "-v", "error", "-y", ...args])
  if (result.code !== 0) {
    throw new Error(`ffmpeg failed: ${result.stderr}`)
  }
}

async function halfOf(from: string, to: string): Promise<void> {
  const bytes = new Uint8Array(await Bun.file(from).arrayBuffer())
  await Bun.write(to, bytes.subarray(0, Math.floor(bytes.length / 2)))
}

async function stillOf(source: string, to: string): Promise<void> {
  await ffmpeg(["-f", "lavfi", "-i", source, "-frames:v", "1", to])
}

async function writeFiles(at: (name: string) => string): Promise<void> {
  await stillOf("testsrc=size=320x180", at("good.png"))
  await stillOf("color=c=black:s=320x180", at("black.png"))
  await ffmpeg([
    "-f",
    "lavfi",
    "-i",
    "testsrc=d=5:s=320x180:r=12",
    "-pix_fmt",
    "yuv420p",
    at("good.mp4"),
  ])
  await ffmpeg([
    "-f",
    "lavfi",
    "-i",
    "color=c=black:d=5:s=320x180:r=12",
    "-pix_fmt",
    "yuv420p",
    at("black.mp4"),
  ])
  await ffmpeg(["-f", "lavfi", "-i", "sine=f=440:d=5", at("good.wav")])
  await ffmpeg([
    "-f",
    "lavfi",
    "-i",
    "anullsrc=r=44100:cl=mono",
    "-t",
    "5",
    at("silent.wav"),
  ])
  await halfOf(at("good.png"), at("truncated.png"))
  await halfOf(at("good.mp4"), at("truncated.mp4"))
  await Bun.write(at("good.glb"), glbOf(meshJson(3), 3))
  await Bun.write(at("empty.glb"), glbOf(meshJson(0), 0))
}

export async function writePlanted(folder: string): Promise<Planted[]> {
  const at = (name: string): string => join(folder, name)
  await writeFiles(at)
  const image: Expected = { kind: "image", ratio: wide }
  const video: Expected = { kind: "video", ratio: wide, seconds: 5 }
  const audio: Expected = { kind: "audio", seconds: 5 }
  const mesh: Expected = { kind: "mesh" }
  return [
    { file: at("good.png"), expected: image, defect: null },
    { file: at("truncated.png"), expected: image, defect: "opens" },
    {
      file: at("good.png"),
      expected: { kind: "image", ratio: 1 },
      defect: "size",
    },
    { file: at("black.png"), expected: image, defect: "no black frame" },
    { file: at("good.mp4"), expected: video, defect: null },
    { file: at("truncated.mp4"), expected: video, defect: "opens" },
    { file: at("black.mp4"), expected: video, defect: "no black frame" },
    { file: at("good.wav"), expected: audio, defect: null },
    { file: at("silent.wav"), expected: audio, defect: "not silent" },
    { file: at("good.glb"), expected: mesh, defect: null },
    { file: at("empty.glb"), expected: mesh, defect: "has faces" },
  ]
}
