export type MediaSize = {
  width: number
  height: number
}

const containers: readonly string[] = ["moov", "trak", "mdia", "minf"]

function u16(bytes: Uint8Array, at: number): number {
  return ((bytes[at] ?? 0) << 8) | (bytes[at + 1] ?? 0)
}

function u24le(bytes: Uint8Array, at: number): number {
  return (
    (bytes[at] ?? 0) |
    ((bytes[at + 1] ?? 0) << 8) |
    ((bytes[at + 2] ?? 0) << 16)
  )
}

function u32(bytes: Uint8Array, at: number): number {
  return (
    ((bytes[at] ?? 0) * 0x1000000 +
      (((bytes[at + 1] ?? 0) << 16) |
        ((bytes[at + 2] ?? 0) << 8) |
        (bytes[at + 3] ?? 0))) >>>
    0
  )
}

function ascii(bytes: Uint8Array, at: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(at, at + length))
}

function sizeOf(width: number, height: number): MediaSize | null {
  return width > 0 && height > 0 ? { width, height } : null
}

function pngSize(bytes: Uint8Array): MediaSize | null {
  return ascii(bytes, 12, 4) === "IHDR"
    ? sizeOf(u32(bytes, 16), u32(bytes, 20))
    : null
}

function jpegSize(bytes: Uint8Array): MediaSize | null {
  let at = 2
  while (at + 9 < bytes.length && bytes[at] === 0xff) {
    const marker = bytes[at + 1] ?? 0
    const length = u16(bytes, at + 2)
    const isFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    if (isFrame) {
      return sizeOf(u16(bytes, at + 7), u16(bytes, at + 5))
    }
    at += 2 + length
  }
  return null
}

function webpSize(bytes: Uint8Array): MediaSize | null {
  const chunk = ascii(bytes, 12, 4)
  if (chunk === "VP8X") {
    return sizeOf(u24le(bytes, 24) + 1, u24le(bytes, 27) + 1)
  }
  if (chunk === "VP8L") {
    const bits =
      (bytes[21] ?? 0) |
      ((bytes[22] ?? 0) << 8) |
      ((bytes[23] ?? 0) << 16) |
      ((bytes[24] ?? 0) << 24)
    return sizeOf((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1)
  }
  if (chunk === "VP8 ") {
    return sizeOf(
      (((bytes[27] ?? 0) << 8) | (bytes[26] ?? 0)) & 0x3fff,
      (((bytes[29] ?? 0) << 8) | (bytes[28] ?? 0)) & 0x3fff
    )
  }
  return null
}

function boxesIn(
  bytes: Uint8Array,
  from: number,
  to: number
): { type: string; start: number; end: number }[] {
  const boxes: { type: string; start: number; end: number }[] = []
  let at = from
  while (at + 8 <= to) {
    const size = u32(bytes, at)
    const end = size === 0 ? to : at + size
    if (size !== 0 && size < 8) {
      break
    }
    boxes.push({ type: ascii(bytes, at + 4, 4), start: at + 8, end })
    at = end
  }
  return boxes
}

function isTurned(bytes: Uint8Array, matrixAt: number): boolean {
  const a = u32(bytes, matrixAt) | 0
  const b = u32(bytes, matrixAt + 4) | 0
  return a === 0 && b !== 0
}

function shownSize(bytes: Uint8Array, end: number): MediaSize | null {
  const width = Math.round(u32(bytes, end - 8) / 65_536)
  const height = Math.round(u32(bytes, end - 4) / 65_536)
  const found = sizeOf(width, height)
  if (found === null || !isTurned(bytes, end - 44)) {
    return found
  }
  return { width: found.height, height: found.width }
}

function trackSize(
  bytes: Uint8Array,
  from: number,
  to: number
): MediaSize | null {
  for (const box of boxesIn(bytes, from, to)) {
    if (box.type === "tkhd") {
      const found = shownSize(bytes, box.end)
      if (found !== null) {
        return found
      }
    }
    if (containers.includes(box.type)) {
      const found = trackSize(bytes, box.start, box.end)
      if (found !== null) {
        return found
      }
    }
  }
  return null
}

/** Reads the width and height a PNG, JPEG, WebP or MP4 file shows, with an MP4 track's quarter turn applied, or null. */
export function mediaSizeOf(bytes: Uint8Array): MediaSize | null {
  if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG") {
    return pngSize(bytes)
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return jpegSize(bytes)
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return webpSize(bytes)
  }
  if (ascii(bytes, 4, 4) === "ftyp") {
    return trackSize(bytes, 0, bytes.length)
  }
  return null
}
