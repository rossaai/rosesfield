function bytesOf(...parts: (number[] | string)[]): Uint8Array {
  return new Uint8Array(
    parts.flatMap((part) =>
      typeof part === "string"
        ? [...part].map((mark) => mark.charCodeAt(0))
        : part
    )
  )
}

function bigEndian(value: number, length: number): number[] {
  return Array.from(
    { length },
    (_, index) => (value >> (8 * (length - 1 - index))) & 0xff
  )
}

function littleEndian(value: number, length: number): number[] {
  return Array.from({ length }, (_, index) => (value >> (8 * index)) & 0xff)
}

export function pngHeader(width: number, height: number): Uint8Array {
  return bytesOf(
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    bigEndian(13, 4),
    "IHDR",
    bigEndian(width, 4),
    bigEndian(height, 4),
    [8, 6, 0, 0, 0]
  )
}

export function jpegHeader(width: number, height: number): Uint8Array {
  return bytesOf(
    [0xff, 0xd8, 0xff, 0xe0],
    bigEndian(16, 2),
    "JFIF",
    [0, 1, 1, 0, 0, 1, 0, 1, 0, 0],
    [0xff, 0xc0],
    bigEndian(17, 2),
    [8],
    bigEndian(height, 2),
    bigEndian(width, 2),
    [3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]
  )
}

export function webpLossyHeader(width: number, height: number): Uint8Array {
  return bytesOf(
    "RIFF",
    littleEndian(30, 4),
    "WEBP",
    "VP8 ",
    littleEndian(18, 4),
    [0, 0, 0, 0x9d, 0x01, 0x2a],
    littleEndian(width, 2),
    littleEndian(height, 2),
    [0, 0]
  )
}

export function webpLosslessHeader(width: number, height: number): Uint8Array {
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14)
  return bytesOf(
    "RIFF",
    littleEndian(26, 4),
    "WEBP",
    "VP8L",
    littleEndian(10, 4),
    [0x2f],
    littleEndian(bits, 4),
    [0, 0, 0, 0, 0]
  )
}

export function webpExtendedHeader(width: number, height: number): Uint8Array {
  return bytesOf(
    "RIFF",
    littleEndian(30, 4),
    "WEBP",
    "VP8X",
    littleEndian(10, 4),
    [0, 0, 0, 0],
    littleEndian(width - 1, 3),
    littleEndian(height - 1, 3)
  )
}

export function padded(bytes: Uint8Array, length: number): Uint8Array {
  const out = new Uint8Array(Math.max(length, bytes.length))
  out.set(bytes)
  return out
}
