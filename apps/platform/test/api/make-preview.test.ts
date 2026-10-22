import { describe, expect, it } from "vitest"
import {
  encodePreview,
  type PreviewCanvas,
  previewLimits,
  previewSizeOf,
} from "@/api/make-preview"

type Drawn = { type: string; quality: number }

function canvasOf(
  sizeOf: (type: string, quality: number) => number,
  typeOf: (type: string) => string = (type) => type
): { canvas: PreviewCanvas; drawn: Drawn[] } {
  const drawn: Drawn[] = []
  return {
    drawn,
    canvas: {
      toBlob: (done, type, quality) => {
        drawn.push({ type, quality })
        done(
          new Blob([new Uint8Array(sizeOf(type, quality))], {
            type: typeOf(type),
          })
        )
      },
    },
  }
}

describe("previewSizeOf", () => {
  it("draws the long side at 320 px and keeps the shape", () => {
    expect(previewSizeOf(1920, 1080)).toEqual({ width: 320, height: 180 })
    expect(previewSizeOf(480, 854)).toEqual({ width: 180, height: 320 })
  })

  it("never draws a small picture larger than it is", () => {
    expect(previewSizeOf(168, 298)).toEqual({ width: 168, height: 298 })
  })
})

describe("encodePreview", () => {
  it("sends a WebP at the first quality that fits in 64 KB", async () => {
    const { canvas, drawn } = canvasOf((_, quality) =>
      quality > 0.6 ? previewLimits.bytes + 1 : 20_000
    )
    const blob = await encodePreview(canvas)
    expect(blob?.type).toBe("image/webp")
    expect(blob?.size).toBe(20_000)
    expect(drawn.map((one) => one.quality)).toEqual([0.82, 0.7, 0.55])
  })

  it("sends a JPEG when the browser draws no WebP", async () => {
    const { canvas } = canvasOf(
      () => 9_000,
      (type) => (type === "image/webp" ? "image/png" : type)
    )
    const blob = await encodePreview(canvas)
    expect(blob?.type).toBe("image/jpeg")
  })

  it("sends nothing when no quality fits in 64 KB", async () => {
    const { canvas } = canvasOf(() => previewLimits.bytes + 1)
    expect(await encodePreview(canvas)).toBeNull()
  })
})
