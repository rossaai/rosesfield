export type ImageSize = { width: number; height: number }

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const jpegFrameMarkers = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
])
const jpegMarkersWithoutLength = new Set([
  0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8,
])

function textAt(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length))
}

function uint24At(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) |
    ((bytes[offset + 1] ?? 0) << 8) |
    ((bytes[offset + 2] ?? 0) << 16)
  )
}

function sized(width: number, height: number): ImageSize | null {
  return width > 0 && height > 0 ? { width, height } : null
}

function pngSize(bytes: Uint8Array, view: DataView): ImageSize | null {
  const isPng = pngSignature.every((byte, index) => bytes[index] === byte)
  if (!isPng || bytes.length < 24 || textAt(bytes, 12, 4) !== "IHDR") {
    return null
  }
  return sized(view.getUint32(16), view.getUint32(20))
}

function jpegSize(bytes: Uint8Array, view: DataView): ImageSize | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null
  }
  let offset = 2
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      return null
    }
    const marker = bytes[offset + 1] ?? 0
    if (marker === 0xff) {
      offset += 1
    } else if (jpegMarkersWithoutLength.has(marker)) {
      offset += 2
    } else if (jpegFrameMarkers.has(marker)) {
      return offset + 9 <= bytes.length
        ? sized(view.getUint16(offset + 7), view.getUint16(offset + 5))
        : null
    } else {
      offset += 2 + view.getUint16(offset + 2)
    }
  }
  return null
}

function webpSize(bytes: Uint8Array, view: DataView): ImageSize | null {
  if (
    bytes.length < 30 ||
    textAt(bytes, 0, 4) !== "RIFF" ||
    textAt(bytes, 8, 4) !== "WEBP"
  ) {
    return null
  }
  switch (textAt(bytes, 12, 4)) {
    case "VP8 ":
      return sized(
        view.getUint16(26, true) & 0x3fff,
        view.getUint16(28, true) & 0x3fff
      )
    case "VP8L": {
      const bits = view.getUint32(21, true)
      return sized((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1)
    }
    case "VP8X":
      return sized(uint24At(bytes, 24) + 1, uint24At(bytes, 27) + 1)
    default:
      return null
  }
}

/** Reads the width and height a PNG, JPEG or WebP file declares in its header, or null when the bytes hold none of them. */
export function imageSizeOf(bytes: Uint8Array): ImageSize | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return pngSize(bytes, view) ?? jpegSize(bytes, view) ?? webpSize(bytes, view)
}
