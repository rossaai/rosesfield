const jsonChunk = 0x4e4f534a
const binChunk = 0x004e4942

function padded(bytes: Uint8Array, fill: number): Uint8Array {
  const length = Math.ceil(bytes.length / 4) * 4
  const out = new Uint8Array(length).fill(fill)
  out.set(bytes)
  return out
}

export function glbOf(json: unknown, bin: Uint8Array | null): ArrayBuffer {
  const text = padded(new TextEncoder().encode(JSON.stringify(json)), 0x20)
  const data = bin === null ? null : padded(bin, 0)
  const length = 12 + 8 + text.length + (data === null ? 0 : 8 + data.length)
  const out = new ArrayBuffer(length)
  const view = new DataView(out)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, length, true)
  view.setUint32(12, text.length, true)
  view.setUint32(16, jsonChunk, true)
  new Uint8Array(out, 20, text.length).set(text)
  if (data !== null) {
    const at = 20 + text.length
    view.setUint32(at, data.length, true)
    view.setUint32(at + 4, binChunk, true)
    new Uint8Array(out, at + 8, data.length).set(data)
  }
  return out
}

export function bytesOf(parts: readonly ArrayBufferView[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const out = new Uint8Array(length)
  let at = 0
  for (const part of parts) {
    out.set(new Uint8Array(part.buffer, part.byteOffset, part.byteLength), at)
    at += part.byteLength
  }
  return out
}

export const trianglePositions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])

export const triangleIndices = new Uint16Array([0, 1, 2, 0])

export const pixel = new Uint8Array([0x89, 0x50, 0x4e, 0x47])

export function triangleGlb(
  extra: Readonly<Record<string, unknown>> = {}
): ArrayBuffer {
  const bin = bytesOf([trianglePositions, triangleIndices, pixel])
  const json = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, translation: [10, 0, 0] }],
    meshes: [
      {
        primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }],
      },
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: [0.5, 0.25, 1, 1],
          baseColorTexture: { index: 0 },
        },
      },
    ],
    textures: [{ source: 0 }],
    images: [{ bufferView: 2, mimeType: "image/png" }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
      { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 8 },
      { buffer: 0, byteOffset: 44, byteLength: 4 },
    ],
    buffers: [{ byteLength: 48 }],
    ...extra,
  }
  return glbOf(json, bin)
}
