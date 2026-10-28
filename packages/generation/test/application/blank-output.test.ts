import { describe, expect, it } from "vitest"
import { isBlankOutput } from "#application/advance-run/blank-output"
import type { EngineOutput } from "#domain/generation-engine.port"
import { writeFlatPng } from "#infrastructure/demo/flat-png"
import { pngBytes } from "../sample"
import { type PlantedPng, plantedPng } from "./planted-png"

function outputOf(kind: EngineOutput["kind"], bytes: Uint8Array): EngineOutput {
  return {
    kind,
    mime: "application/octet-stream",
    bytes,
    width: null,
    height: null,
    durationSeconds: null,
  }
}

function imageOf(bytes: Uint8Array): EngineOutput {
  return outputOf("image", bytes)
}

function litAt(count: number): PlantedPng["pixel"] {
  return (column, row) =>
    row * 10 + column < count ? [200, 180, 160] : [0, 0, 0]
}

async function isBlank(png: PlantedPng): Promise<boolean> {
  return isBlankOutput(imageOf(await plantedPng(png)))
}

describe("isBlankOutput", () => {
  it("finds a black image black and a gray one not", async () => {
    const black = await writeFlatPng({ width: 64, height: 36, gray: 0 })
    const gray = await writeFlatPng({ width: 64, height: 36, gray: 128 })
    expect(await isBlankOutput(imageOf(black))).toBe(true)
    expect(await isBlankOutput(imageOf(gray))).toBe(false)
  })

  it.each([0, 1, 2, 3, 4] as const)(
    "reads rows written with filter %s",
    async (filter) => {
      const size = { width: 10, height: 10, colorType: 2, filter } as const
      expect(await isBlank({ ...size, pixel: litAt(2) })).toBe(true)
      expect(await isBlank({ ...size, pixel: litAt(3) })).toBe(false)
    }
  )

  it("treats a pixel under the black-frame luma as black", async () => {
    const size = { width: 4, height: 4, colorType: 2 } as const
    expect(await isBlank({ ...size, pixel: () => [9, 9, 9] })).toBe(true)
    expect(await isBlank({ ...size, pixel: () => [12, 12, 12] })).toBe(false)
  })

  it("reads 16-bit samples, alpha and palettes", async () => {
    const size = { width: 4, height: 4 } as const
    const deep = { ...size, colorType: 6, bitDepth: 16 } as const
    expect(await isBlank({ ...deep, pixel: () => [0, 0, 0, 255] })).toBe(true)
    expect(await isBlank({ ...deep, pixel: () => [90, 0, 0, 255] })).toBe(false)
    const clear = { ...size, colorType: 4 } as const
    expect(await isBlank({ ...clear, pixel: () => [255, 0] })).toBe(true)
    expect(await isBlank({ ...clear, pixel: () => [255, 255] })).toBe(false)
    const palette = [0, 0, 0, 0, 200, 0]
    const indexed = { ...size, colorType: 3, palette } as const
    expect(await isBlank({ ...indexed, pixel: () => [0] })).toBe(true)
    expect(await isBlank({ ...indexed, pixel: () => [1] })).toBe(false)
  })

  it("judges a cut-out on a transparent ground by its opaque pixels", async () => {
    const size = { width: 100, height: 100, colorType: 6 } as const
    const cutout = (subject: number[], ground: number[]): PlantedPng => ({
      ...size,
      pixel: (column, row) => (column < 10 && row < 10 ? subject : ground),
    })
    const clear = [0, 0, 0, 0]
    expect(await isBlank(cutout([200, 40, 60, 255], clear))).toBe(false)
    expect(await isBlank(cutout([0, 0, 0, 255], clear))).toBe(true)
    expect(await isBlank(cutout([200, 40, 60, 255], [0, 0, 0, 255]))).toBe(true)
    expect(await isBlank(cutout(clear, clear))).toBe(true)
  })

  it("finds an image or a video with no bytes empty", async () => {
    const empty = new Uint8Array(0)
    expect(await isBlankOutput(outputOf("image", empty))).toBe(true)
    expect(await isBlankOutput(outputOf("video", empty))).toBe(true)
    expect(await isBlankOutput(outputOf("text", empty))).toBe(false)
    expect(await isBlankOutput(outputOf("audio", empty))).toBe(false)
  })

  it("never drops a file it cannot read", async () => {
    const black = await writeFlatPng({ width: 8, height: 8, gray: 0 })
    const cut = black.subarray(0, black.length - 20)
    expect(await isBlankOutput(imageOf(pngBytes()))).toBe(false)
    expect(await isBlankOutput(imageOf(cut))).toBe(false)
    expect(await isBlankOutput(imageOf(Uint8Array.of(0xff, 0xd8)))).toBe(false)
    const clip = outputOf("video", Uint8Array.of(0, 0, 0, 24))
    expect(await isBlankOutput(clip)).toBe(false)
  })
})
