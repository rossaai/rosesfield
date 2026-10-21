import { concatBytes } from "#infrastructure/demo/concat-bytes"
import { crc32 } from "#infrastructure/demo/flat-png"

export type PlantedPng = {
  width: number
  height: number
  colorType: 0 | 2 | 3 | 4 | 6
  bitDepth?: 8 | 16
  filter?: 0 | 1 | 2 | 3 | 4
  pixel: (column: number, row: number) => readonly number[]
  palette?: readonly number[]
  transparency?: readonly number[]
}

function predictor(
  filter: number,
  left: number,
  up: number,
  upLeft: number
): number {
  if (filter === 1) {
    return left
  }
  if (filter === 2) {
    return up
  }
  if (filter === 3) {
    return Math.floor((left + up) / 2)
  }
  if (filter === 4) {
    const estimate = left + up - upLeft
    const toLeft = Math.abs(estimate - left)
    const toUp = Math.abs(estimate - up)
    const toUpLeft = Math.abs(estimate - upLeft)
    if (toLeft <= toUp && toLeft <= toUpLeft) {
      return left
    }
    return toUp <= toUpLeft ? up : upLeft
  }
  return 0
}

function rawRow(png: PlantedPng, row: number): number[] {
  const samples: number[] = []
  for (let column = 0; column < png.width; column += 1) {
    for (const sample of png.pixel(column, row)) {
      samples.push(...(png.bitDepth === 16 ? [sample, 7] : [sample]))
    }
  }
  return samples
}

function filteredRows(png: PlantedPng, step: number): Uint8Array {
  const filter = png.filter ?? 0
  const rows: number[] = []
  let previous: number[] = []
  for (let row = 0; row < png.height; row += 1) {
    const raw = rawRow(png, row)
    rows.push(filter)
    for (let index = 0; index < raw.length; index += 1) {
      const left = index >= step ? (raw[index - step] ?? 0) : 0
      const upLeft = index >= step ? (previous[index - step] ?? 0) : 0
      const guess = predictor(filter, left, previous[index] ?? 0, upLeft)
      rows.push(((raw[index] ?? 0) - guess) & 0xff)
    }
    previous = raw
  }
  return Uint8Array.from(rows)
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

export async function plantedPng(png: PlantedPng): Promise<Uint8Array> {
  const bitDepth = png.bitDepth ?? 8
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[png.colorType]
  const header = new Uint8Array(13)
  const view = new DataView(header.buffer)
  view.setUint32(0, png.width)
  view.setUint32(4, png.height)
  header.set([bitDepth, png.colorType, 0, 0, 0], 8)
  const data = await deflate(filteredRows(png, (channels * bitDepth) / 8))
  const half = Math.floor(data.length / 2)
  return concatBytes([
    Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10),
    chunk("IHDR", header),
    ...(png.palette === undefined
      ? []
      : [chunk("PLTE", Uint8Array.from(png.palette))]),
    ...(png.transparency === undefined
      ? []
      : [chunk("tRNS", Uint8Array.from(png.transparency))]),
    chunk("IDAT", data.subarray(0, half)),
    chunk("IDAT", data.subarray(half)),
    chunk("IEND", new Uint8Array(0)),
  ])
}
