const magic = 0x46546c67
const version = 2
const jsonChunk = 0x4e4f534a
const binChunk = 0x004e4942
const headerBytes = 12
const chunkHeaderBytes = 8
const floatComponent = 5126
const corners = [0, 0, 0, 1, 0, 0, 0, 1, 0]

export function writeTriangleGlb(): Uint8Array {
  const positions = new Float32Array(corners)
  const bin = new Uint8Array(positions.buffer)
  const json = padTo4(
    new TextEncoder().encode(
      JSON.stringify({
        asset: { version: "2.0" },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        accessors: [
          {
            bufferView: 0,
            componentType: floatComponent,
            count: 3,
            type: "VEC3",
            min: [0, 0, 0],
            max: [1, 1, 0],
          },
        ],
        bufferViews: [{ buffer: 0, byteLength: bin.length }],
        buffers: [{ byteLength: bin.length }],
      })
    ),
    0x20
  )
  const total =
    headerBytes + chunkHeaderBytes + json.length + chunkHeaderBytes + bin.length
  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)
  view.setUint32(0, magic, true)
  view.setUint32(4, version, true)
  view.setUint32(8, total, true)
  view.setUint32(12, json.length, true)
  view.setUint32(16, jsonChunk, true)
  out.set(json, 20)
  const binStart = 20 + json.length
  view.setUint32(binStart, bin.length, true)
  view.setUint32(binStart + 4, binChunk, true)
  out.set(bin, binStart + chunkHeaderBytes)
  return out
}

function padTo4(bytes: Uint8Array, fill: number): Uint8Array {
  const padded = new Uint8Array(Math.ceil(bytes.length / 4) * 4).fill(fill)
  padded.set(bytes)
  return padded
}
