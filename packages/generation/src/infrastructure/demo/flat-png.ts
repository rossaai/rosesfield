import { concatBytes } from "#infrastructure/demo/concat-bytes"

type FlatPngOptions = {
  width: number
  height: number
  gray: number
}

const signature = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10)
const crcTable = buildCrcTable()

export async function writeFlatPng(
  options: FlatPngOptions
): Promise<Uint8Array> {
  const header = new Uint8Array(13)
  const view = new DataView(header.buffer)
  view.setUint32(0, options.width)
  view.setUint32(4, options.height)
  header.set([8, 0, 0, 0, 0], 8)
  const pixels = await deflate(rowsOf(options))
  return concatBytes([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", pixels),
    chunk("IEND", new Uint8Array(0)),
  ])
}

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc = (crcTable[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function rowsOf(options: FlatPngOptions): Uint8Array {
  const rowBytes = options.width + 1
  const raw = new Uint8Array(rowBytes * options.height).fill(options.gray)
  for (let row = 0; row < options.height; row += 1) {
    raw[row * rowBytes] = 0
  }
  return raw
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(bytes)])
    .stream()
    .pipeThrough(new CompressionStream("deflate"))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typed = concatBytes([new TextEncoder().encode(type), data])
  const out = new Uint8Array(typed.length + 8)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  out.set(typed, 4)
  view.setUint32(typed.length + 4, crc32(typed))
  return out
}

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
}
