import { describe, expect, it } from "vitest"
import { writeFlatMp4 } from "#infrastructure/demo/flat-mp4"
import { writeFlatPng } from "#infrastructure/demo/flat-png"
import { mediaSizeOf } from "#infrastructure/media-size"

function jpegOf(width: number, height: number): Uint8Array {
  return Uint8Array.of(
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x04,
    0x00,
    0x00,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    0x03
  )
}

function webpOf(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(30)
  bytes.set(new TextEncoder().encode("RIFF"), 0)
  bytes.set(new TextEncoder().encode("WEBPVP8X"), 8)
  const w = width - 1
  const h = height - 1
  bytes.set([w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff], 24)
  bytes.set([h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff], 27)
  return bytes
}

const quarterTurn = [0, 1, 0, -1, 0, 0, 0, 0, 0x4000]

function turnedMp4(width: number, height: number): Uint8Array {
  const bytes = writeFlatMp4({ width, height, seconds: 1 })
  const view = new DataView(bytes.buffer)
  const name = new TextDecoder("latin1").decode(bytes).indexOf("tkhd")
  const end = name - 4 + view.getUint32(name - 4)
  quarterTurn.forEach((value, index) => {
    view.setInt32(end - 44 + index * 4, value * 0x10000)
  })
  return bytes
}

describe("mediaSizeOf", () => {
  it("reads the size a PNG, a JPEG and a WebP declare", async () => {
    expect(
      mediaSizeOf(await writeFlatPng({ width: 48, height: 27, gray: 128 }))
    ).toEqual({ width: 48, height: 27 })
    expect(mediaSizeOf(jpegOf(1536, 1024))).toEqual({
      width: 1536,
      height: 1024,
    })
    expect(mediaSizeOf(webpOf(768, 1344))).toEqual({ width: 768, height: 1344 })
  })

  it("reads the size of an MP4's video track", () => {
    expect(
      mediaSizeOf(writeFlatMp4({ width: 64, height: 36, seconds: 1 }))
    ).toEqual({ width: 64, height: 36 })
  })

  it("reads a video turned a quarter as the shape it shows", () => {
    expect(mediaSizeOf(turnedMp4(64, 36))).toEqual({ width: 36, height: 64 })
  })

  it("answers null for bytes with no known header", () => {
    expect(mediaSizeOf(Uint8Array.of(1, 2, 3, 4))).toBeNull()
  })
})
