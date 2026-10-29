import type { AssetKind } from "@rosesfield/contract"
import { FixedClock } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import type { EngineRequest } from "#domain/generation-engine.port"
import { comfyWorkflow } from "#infrastructure/comfy/comfy-workflow-binding"
import { crc32 } from "#infrastructure/demo/flat-png"
import { DemoGenerationEngine } from "#infrastructure/demo-generation-engine"
import { fakeBinding, start } from "../sample"

function setup() {
  const clock = new FixedClock({ now: start })
  return { clock, engine: new DemoGenerationEngine({ clock }) }
}

function request(
  outputKind: AssetKind,
  aspectRatio: string | null,
  count = 1
): EngineRequest {
  return {
    idempotencyKey: "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f",
    binding: fakeBinding,
    inputs: {},
    files: [],
    count,
    aspectRatio,
    seed: null,
    outputKind,
  }
}

async function outputsOf(
  kind: AssetKind,
  aspectRatio: string | null,
  count = 1
) {
  const { clock, engine } = setup()
  const { ref } = await engine.submit(request(kind, aspectRatio, count))
  clock.advance(DemoGenerationEngine.delayMs)
  return engine.listOutputs(ref)
}

type Box = { type: string; start: number; size: number }

function boxesIn(bytes: Uint8Array, from: number, to: number): Box[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset)
  const boxes: Box[] = []
  for (let offset = from; offset < to; ) {
    const size = view.getUint32(offset)
    const type = new TextDecoder().decode(bytes.slice(offset + 4, offset + 8))
    boxes.push({ type, start: offset, size })
    offset += size
  }
  return boxes
}

function child(bytes: Uint8Array, parent: Box, type: string, skip = 0): Box {
  const found = boxesIn(
    bytes,
    parent.start + 8 + skip,
    parent.start + parent.size
  )
  const box = found.find((candidate) => candidate.type === type)
  if (box === undefined) {
    throw new Error(`no ${type} box`)
  }
  return box
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(bytes)])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

describe("DemoGenerationEngine", () => {
  it("runs every binding, as the demo origin", () => {
    const { engine } = setup()
    expect(engine.canRun({ adapter: "comfy-workflow", config: {} })).toBe(true)
    expect(engine.origin).toBe("demo")
  })

  it("waits its delay before the run succeeds", async () => {
    const { clock, engine } = setup()
    const { ref } = await engine.submit(request("image", "1:1"))
    expect(await engine.read(ref)).toEqual({
      state: "queued",
      progress: null,
      retryAfterSeconds: 1,
    })
    clock.advance(2000)
    expect(await engine.read(ref)).toMatchObject({ state: "running" })
    clock.advance(1000)
    expect(await engine.read(ref)).toEqual({ state: "succeeded" })
  })

  it("makes a flat gray PNG in the run's format", async () => {
    const [output] = await outputsOf("image", "16:9")
    expect(output).toMatchObject({
      mime: "image/png",
      width: 1024,
      height: 576,
    })
    const bytes = output?.bytes ?? new Uint8Array(0)
    const view = new DataView(bytes.buffer, bytes.byteOffset)
    expect(view.getUint32(16)).toBe(1024)
    expect(view.getUint32(20)).toBe(576)
    expect(view.getUint32(29)).toBe(crc32(bytes.slice(12, 29)))
    const idatLength = view.getUint32(33)
    const pixels = await inflate(bytes.slice(41, 41 + idatLength))
    expect(pixels.length).toBe(576 * 1025)
    const values = new Set(pixels.filter((_, index) => index % 1025 !== 0))
    expect([...values]).toEqual([128])
  })

  it("makes a 2 second MP4 whose chunk offset points into its media", async () => {
    const [output] = await outputsOf("video", "9:16")
    expect(output).toMatchObject({
      mime: "video/mp4",
      width: 360,
      height: 640,
      durationSeconds: 2,
    })
    const bytes = output?.bytes ?? new Uint8Array(0)
    const view = new DataView(bytes.buffer, bytes.byteOffset)
    const top = boxesIn(bytes, 0, bytes.length)
    expect(top.map((box) => box.type)).toEqual(["ftyp", "moov", "mdat"])
    const [, moov, mdat] = top
    if (moov === undefined || mdat === undefined) {
      throw new Error("missing boxes")
    }
    const trak = child(bytes, moov, "trak")
    const tkhd = child(bytes, trak, "tkhd")
    expect(view.getUint32(tkhd.start + 84) / 0x10000).toBe(360)
    expect(view.getUint32(tkhd.start + 88) / 0x10000).toBe(640)
    const stbl = child(
      bytes,
      child(bytes, child(bytes, trak, "mdia"), "minf"),
      "stbl"
    )
    const stsz = child(bytes, stbl, "stsz")
    expect(view.getUint32(stsz.start + 16)).toBe(10)
    const stco = child(bytes, stbl, "stco")
    expect(view.getUint32(stco.start + 16)).toBe(mdat.start + 8)
    expect(view.getUint32(child(bytes, moov, "mvhd").start + 24)).toBe(2000)
  })

  it("makes 2 seconds of silent WAV audio", async () => {
    const [output] = await outputsOf("audio", null)
    const bytes = output?.bytes ?? new Uint8Array(0)
    const view = new DataView(bytes.buffer, bytes.byteOffset)
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("RIFF")
    expect(view.getUint32(24, true)).toBe(24_000)
    expect(view.getUint32(40, true)).toBe(96_000)
    expect(bytes.slice(44).every((byte) => byte === 0)).toBe(true)
    expect(output).toMatchObject({ mime: "audio/wav", durationSeconds: 2 })
  })

  it("makes an empty text output", async () => {
    const [output] = await outputsOf("text", null)
    expect(output).toMatchObject({ kind: "text", mime: "text/plain" })
    expect(output?.bytes.length).toBe(0)
  })

  it("makes a GLB mesh of one triangle", async () => {
    const [output] = await outputsOf("mesh", null)
    expect(output).toMatchObject({
      kind: "mesh",
      mime: "model/gltf-binary",
      width: null,
      height: null,
      durationSeconds: null,
    })
    const bytes = output?.bytes ?? new Uint8Array(0)
    const view = new DataView(bytes.buffer, bytes.byteOffset)
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("glTF")
    expect(view.getUint32(4, true)).toBe(2)
    expect(view.getUint32(8, true)).toBe(bytes.length)
    const jsonLength = view.getUint32(12, true)
    expect(new TextDecoder().decode(bytes.slice(16, 20))).toBe("JSON")
    const json = JSON.parse(
      new TextDecoder().decode(bytes.slice(20, 20 + jsonLength))
    )
    expect(json.asset.version).toBe("2.0")
    expect(json.accessors[0]).toMatchObject({ count: 3, type: "VEC3" })
    const binStart = 20 + jsonLength
    const binLength = view.getUint32(binStart, true)
    expect(
      new TextDecoder().decode(bytes.slice(binStart + 4, binStart + 7))
    ).toBe("BIN")
    expect(binLength).toBe(json.buffers[0].byteLength)
    expect(binStart + 8 + binLength).toBe(bytes.length)
    const corners = new Float32Array(
      bytes.slice(binStart + 8, binStart + 8 + binLength).buffer
    )
    expect([...corners]).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0])
  })

  it("makes as many outputs as the run asked for", async () => {
    expect(await outputsOf("image", "1:1", 3)).toHaveLength(3)
  })

  it("refuses a reference it did not make", async () => {
    const { engine } = setup()
    await expect(engine.read("job-1")).rejects.toMatchObject({
      code: "RUN_FAILED",
    })
  })
})

describe("the demo engine's held images", () => {
  const graph = {
    "68": { class_type: "SaveVideo", inputs: {} },
    "1011": { class_type: "SaveImage", inputs: {} },
  }

  async function outputsFor(results: readonly string[] | undefined) {
    const { clock, engine } = setup()
    const binding = comfyWorkflow({
      workflow: graph,
      bindings: [],
      models: [],
      ...(results === undefined ? {} : { results: [...results] }),
    })
    const { ref } = await engine.submit({ ...request("video", "2:3"), binding })
    clock.advance(DemoGenerationEngine.delayMs)
    return engine.listOutputs(ref)
  }

  it("saves an image for each save node a binding does not name as a result, under that node", async () => {
    const outputs = await outputsFor(["68"])
    expect(outputs.map((one) => [one.kind, one.nodeId])).toEqual([
      ["video", undefined],
      ["image", "1011"],
    ])
    const { engine } = setup()
    expect(
      engine.resultNodesOf(
        comfyWorkflow({
          workflow: graph,
          bindings: [],
          models: [],
          results: ["68"],
        })
      )
    ).toEqual(["68"])
  })

  it("saves no held image for a binding that names no results, the control", async () => {
    const outputs = await outputsFor(undefined)
    expect(outputs.map((one) => one.kind)).toEqual(["video"])
  })
})
