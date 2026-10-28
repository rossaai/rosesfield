import type { EngineOutput } from "#domain/generation-engine.port"

type ColorType = 0 | 2 | 3 | 4 | 6

type PngHeader = {
  width: number
  height: number
  bitDepth: 8 | 16
  colorType: ColorType
}

type Png = PngHeader & {
  palette: Uint8Array
  transparency: Uint8Array
  data: Uint8Array[]
}

type Rgba = [number, number, number, number]

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const blackLuma = 24
const blackShare = 0.98

export async function isBlankOutput(output: EngineOutput): Promise<boolean> {
  if (output.kind !== "image" && output.kind !== "video") {
    return false
  }
  if (output.bytes.length === 0) {
    return true
  }
  if (output.kind === "image") {
    return isBlackImage(output.bytes)
  }
  const stills = output.stills ?? []
  if (stills.length === 0) {
    return false
  }
  const black = await Promise.all(stills.map(isBlackImage))
  return black.every((isStillBlack) => isStillBlack)
}

function isBlackImage(bytes: Uint8Array): Promise<boolean> {
  const png = pngOf(bytes)
  return png === null ? Promise.resolve(false) : isBlackPng(png)
}

function isColorType(value: number): value is ColorType {
  return value === 0 || value === 2 || value === 3 || value === 4 || value === 6
}

function channelsOf(colorType: ColorType): number {
  switch (colorType) {
    case 0:
    case 3:
      return 1
    case 4:
      return 2
    case 2:
      return 3
    case 6:
      return 4
  }
}

function headerOf(body: Uint8Array): PngHeader | null {
  if (body.length !== 13) {
    return null
  }
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength)
  const bitDepth = body[8] ?? 0
  const colorType = body[9] ?? 0
  const width = view.getUint32(0)
  const height = view.getUint32(4)
  const isInterlaced = body[12] !== 0
  if (isInterlaced || width === 0 || height === 0 || !isColorType(colorType)) {
    return null
  }
  if (bitDepth === 8 || (bitDepth === 16 && colorType !== 3)) {
    return { width, height, bitDepth, colorType }
  }
  return null
}

function chunksOf(bytes: Uint8Array): Map<string, Uint8Array[]> | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const chunks = new Map<string, Uint8Array[]>()
  let offset = pngSignature.length
  while (offset + 8 <= bytes.length) {
    const start = offset + 8
    const end = start + view.getUint32(offset)
    if (end + 4 > bytes.length) {
      return null
    }
    const type = String.fromCharCode(...bytes.subarray(offset + 4, start))
    const found = chunks.get(type) ?? []
    found.push(bytes.subarray(start, end))
    chunks.set(type, found)
    if (type === "IEND") {
      return chunks
    }
    offset = end + 4
  }
  return null
}

function pngOf(bytes: Uint8Array): Png | null {
  const isPng = pngSignature.every((byte, index) => bytes[index] === byte)
  const chunks = isPng ? chunksOf(bytes) : null
  if (chunks === null) {
    return null
  }
  const [ihdr] = chunks.get("IHDR") ?? []
  const header = ihdr === undefined ? null : headerOf(ihdr)
  const data = chunks.get("IDAT") ?? []
  if (header === null || data.length === 0) {
    return null
  }
  const [palette] = chunks.get("PLTE") ?? []
  const [transparency] = chunks.get("tRNS") ?? []
  return {
    ...header,
    palette: palette ?? new Uint8Array(0),
    transparency: transparency ?? new Uint8Array(0),
    data,
  }
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft
  const toLeft = Math.abs(estimate - left)
  const toUp = Math.abs(estimate - up)
  const toUpLeft = Math.abs(estimate - upLeft)
  if (toLeft <= toUp && toLeft <= toUpLeft) {
    return left
  }
  return toUp <= toUpLeft ? up : upLeft
}

function predicted(
  filter: number,
  left: number,
  up: number,
  upLeft: number
): number {
  switch (filter) {
    case 1:
      return left
    case 2:
      return up
    case 3:
      return Math.floor((left + up) / 2)
    case 4:
      return paeth(left, up, upLeft)
    default:
      return 0
  }
}

function unfilter(
  filter: number,
  row: Uint8Array,
  previous: Uint8Array,
  step: number
): boolean {
  if (filter < 0 || filter > 4) {
    return false
  }
  for (let index = 0; index < row.length; index += 1) {
    const hasLeft = index >= step
    const left = hasLeft ? (row[index - step] ?? 0) : 0
    const upLeft = hasLeft ? (previous[index - step] ?? 0) : 0
    const guess = predicted(filter, left, previous[index] ?? 0, upLeft)
    row[index] = ((row[index] ?? 0) + guess) & 0xff
  }
  return true
}

function rgbaAt(png: Png, row: Uint8Array, column: number): Rgba {
  const size = png.bitDepth / 8
  const at = column * channelsOf(png.colorType) * size
  const sample = (channel: number): number => row[at + channel * size] ?? 0
  switch (png.colorType) {
    case 0:
      return [sample(0), sample(0), sample(0), 255]
    case 2:
      return [sample(0), sample(1), sample(2), 255]
    case 3: {
      const entry = sample(0) * 3
      return [
        png.palette[entry] ?? 0,
        png.palette[entry + 1] ?? 0,
        png.palette[entry + 2] ?? 0,
        png.transparency[sample(0)] ?? 255,
      ]
    }
    case 4:
      return [sample(0), sample(0), sample(0), sample(1)]
    case 6:
      return [sample(0), sample(1), sample(2), sample(3)]
  }
}

function isBlack([red, green, blue]: Rgba): boolean {
  const luma = 16 + (65.481 * red + 128.553 * green + 24.966 * blue) / 255
  return luma < blackLuma
}

function isClear([, , , alpha]: Rgba): boolean {
  return alpha === 0
}

class BlackRows {
  private readonly png: Png
  private readonly step: number
  private readonly allowed: number
  private previous: Uint8Array
  private current: Uint8Array
  private filter = -1
  private filled = 0
  private rows = 0
  private lit = 0
  private opaque = 0

  constructor(png: Png) {
    this.png = png
    this.step = channelsOf(png.colorType) * (png.bitDepth / 8)
    const pixels = png.width * png.height
    this.allowed = pixels - Math.ceil(pixels * blackShare)
    this.previous = new Uint8Array(png.width * this.step)
    this.current = new Uint8Array(png.width * this.step)
  }

  isWhole(): boolean {
    return this.rows === this.png.height
  }

  isBlack(): boolean {
    const allowed = this.opaque - Math.ceil(this.opaque * blackShare)
    return this.isWhole() && this.lit <= allowed
  }

  isLitAfter(chunk: Uint8Array): boolean {
    let at = 0
    while (at < chunk.length && !this.isWhole()) {
      if (this.filter < 0) {
        this.filter = chunk[at] ?? 0
        at += 1
        continue
      }
      const room = this.current.length - this.filled
      const take = Math.min(room, chunk.length - at)
      this.current.set(chunk.subarray(at, at + take), this.filled)
      this.filled += take
      at += take
      if (this.filled === this.current.length && this.isLitAfterRow()) {
        return true
      }
    }
    return false
  }

  private isLitAfterRow(): boolean {
    if (!unfilter(this.filter, this.current, this.previous, this.step)) {
      return true
    }
    for (let column = 0; column < this.png.width; column += 1) {
      const pixel = rgbaAt(this.png, this.current, column)
      if (!isClear(pixel)) {
        this.opaque += 1
        this.lit += isBlack(pixel) ? 0 : 1
      }
    }
    const done = this.current
    this.current = this.previous
    this.previous = done
    this.filter = -1
    this.filled = 0
    this.rows += 1
    return this.lit > this.allowed
  }
}

async function isBlackPng(png: Png): Promise<boolean> {
  const rows = new BlackRows(png)
  const reader = new Blob(png.data.map((part) => new Uint8Array(part)))
    .stream()
    .pipeThrough(new DecompressionStream("deflate"))
    .getReader()
  try {
    for (
      let chunk = await reader.read();
      !chunk.done;
      chunk = await reader.read()
    ) {
      if (rows.isLitAfter(chunk.value)) {
        return false
      }
    }
    return rows.isBlack()
  } catch {
    return false
  } finally {
    await reader.cancel().catch(() => undefined)
  }
}
