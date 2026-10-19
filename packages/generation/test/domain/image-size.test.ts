import { describe, expect, it } from "vitest"
import { imageSizeOf } from "#domain/image-size"
import {
  jpegHeader,
  pngHeader,
  webpExtendedHeader,
  webpLosslessHeader,
  webpLossyHeader,
} from "../image-bytes"

describe("imageSizeOf", () => {
  it("reads the width and height a PNG, a JPEG and each kind of WebP declare", () => {
    expect(imageSizeOf(pngHeader(1024, 600))).toEqual({
      width: 1024,
      height: 600,
    })
    expect(imageSizeOf(jpegHeader(640, 479))).toEqual({
      width: 640,
      height: 479,
    })
    expect(imageSizeOf(webpLossyHeader(800, 450))).toEqual({
      width: 800,
      height: 450,
    })
    expect(imageSizeOf(webpLosslessHeader(300, 1200))).toEqual({
      width: 300,
      height: 1200,
    })
    expect(imageSizeOf(webpExtendedHeader(4000, 3000))).toEqual({
      width: 4000,
      height: 3000,
    })
  })

  it("reads no size from bytes that hold no image header", () => {
    expect(
      imageSizeOf(new TextEncoder().encode("GIF89a, not a photo at all"))
    ).toBeNull()
    expect(imageSizeOf(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull()
    expect(imageSizeOf(new Uint8Array())).toBeNull()
  })
})
