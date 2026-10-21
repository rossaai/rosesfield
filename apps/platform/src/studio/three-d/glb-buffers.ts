export type Json = Readonly<Record<string, unknown>>

export type Glb = {
  json: Json
  bin: DataView | null
}

type Span = {
  data: DataView
  start: number
  stride: number
  count: number
  size: number
  component: number
  bytes: number
  normalized: boolean
}

const magic = 0x46546c67
const jsonChunk = 0x4e4f534a
const binChunk = 0x004e4942

const typeSizes: Readonly<Record<string, number>> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
}

const componentBytes: Readonly<Record<number, number>> = {
  5120: 1,
  5121: 1,
  5122: 2,
  5123: 2,
  5125: 4,
  5126: 4,
}

const floatComponent = 5126

export function isJson(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function listOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function numbersOf(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }
  const numbers = value.filter(
    (item): item is number => typeof item === "number"
  )
  return numbers.length === value.length ? numbers : undefined
}

export function itemOf(json: Json, key: string, index: unknown): Json | null {
  if (typeof index !== "number") {
    return null
  }
  const item = listOf(json[key])[index]
  return isJson(item) ? item : null
}

export function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function jsonOf(bytes: ArrayBuffer, start: number, length: number): unknown {
  const text = new TextDecoder().decode(new Uint8Array(bytes, start, length))
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function chunksOf(bytes: ArrayBuffer): Glb | null {
  const view = new DataView(bytes)
  if (bytes.byteLength < 20 || view.getUint32(0, true) !== magic) {
    return null
  }
  if (view.getUint32(4, true) !== 2) {
    return null
  }
  let json: unknown = null
  let bin: DataView | null = null
  let offset = 12
  while (offset + 8 <= bytes.byteLength) {
    const length = view.getUint32(offset, true)
    const type = view.getUint32(offset + 4, true)
    const start = offset + 8
    if (start + length > bytes.byteLength) {
      return null
    }
    if (type === jsonChunk && json === null) {
      json = jsonOf(bytes, start, length)
    } else if (type === binChunk && bin === null) {
      bin = new DataView(bytes, start, length)
    }
    offset = start + length + ((4 - (length % 4)) % 4)
  }
  return isJson(json) ? { json, bin } : null
}

function spanOf(glb: Glb, index: unknown): Span | null {
  const accessor = itemOf(glb.json, "accessors", index)
  if (accessor === null || accessor.sparse !== undefined || glb.bin === null) {
    return null
  }
  const view = itemOf(glb.json, "bufferViews", accessor.bufferView)
  const size = typeSizes[String(accessor.type)]
  const component = numberOr(accessor.componentType, 0)
  const bytes = componentBytes[component]
  const count = numberOr(accessor.count, 0)
  if (view === null || size === undefined || bytes === undefined || count < 1) {
    return null
  }
  const viewStart = numberOr(view.byteOffset, 0)
  const viewEnd = viewStart + numberOr(view.byteLength, 0)
  const start = viewStart + numberOr(accessor.byteOffset, 0)
  const stride = numberOr(view.byteStride, size * bytes)
  const end = start + (count - 1) * stride + size * bytes
  if (end > viewEnd || end > glb.bin.byteLength) {
    return null
  }
  const normalized = accessor.normalized === true
  return {
    data: glb.bin,
    start,
    stride,
    count,
    size,
    component,
    bytes,
    normalized,
  }
}

function readComponent(span: Span, at: number): number {
  const { data, normalized } = span
  switch (span.component) {
    case 5120:
      return normalized
        ? Math.max(data.getInt8(at) / 127, -1)
        : data.getInt8(at)
    case 5121:
      return normalized ? data.getUint8(at) / 255 : data.getUint8(at)
    case 5122:
      return normalized
        ? Math.max(data.getInt16(at, true) / 32767, -1)
        : data.getInt16(at, true)
    case 5123:
      return normalized
        ? data.getUint16(at, true) / 65535
        : data.getUint16(at, true)
    case 5125:
      return data.getUint32(at, true)
    default:
      return data.getFloat32(at, true)
  }
}

export function readFloats(
  glb: Glb,
  index: unknown,
  size: number
): Float32Array | null {
  const span = spanOf(glb, index)
  if (span === null || span.size !== size) {
    return null
  }
  const out = new Float32Array(span.count * size)
  for (let item = 0; item < span.count; item += 1) {
    for (let part = 0; part < size; part += 1) {
      const at = span.start + item * span.stride + part * span.bytes
      out[item * size + part] = readComponent(span, at)
    }
  }
  return out
}

export function readIndices(
  glb: Glb,
  index: unknown,
  vertices: number
): Uint32Array | null {
  if (index === undefined) {
    return Uint32Array.from({ length: vertices }, (_, at) => at)
  }
  const span = spanOf(glb, index)
  if (span === null || span.size !== 1 || span.component === floatComponent) {
    return null
  }
  const plain = { ...span, normalized: false }
  const out = new Uint32Array(span.count)
  for (let item = 0; item < span.count; item += 1) {
    const value = readComponent(plain, span.start + item * span.stride)
    if (value >= vertices) {
      return null
    }
    out[item] = value
  }
  return out
}

export function bytesOfView(glb: Glb, index: unknown): Uint8Array | null {
  const view = itemOf(glb.json, "bufferViews", index)
  if (view === null || glb.bin === null) {
    return null
  }
  const start = numberOr(view.byteOffset, 0)
  const length = numberOr(view.byteLength, 0)
  if (length < 1 || start + length > glb.bin.byteLength) {
    return null
  }
  return new Uint8Array(glb.bin.buffer, glb.bin.byteOffset + start, length)
}
