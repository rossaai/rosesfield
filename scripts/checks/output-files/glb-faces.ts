const glbMagic = 0x46546c67
const jsonChunk = 0x4e4f534a

type Accessor = { count?: unknown }
type Primitive = {
  indices?: unknown
  attributes?: { POSITION?: unknown }
  mode?: unknown
}
type Gltf = { accessors?: Accessor[]; meshes?: { primitives?: Primitive[] }[] }

function isGltf(value: unknown): value is Gltf {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function countAt(gltf: Gltf, index: unknown): number {
  if (typeof index !== "number") {
    return 0
  }
  const count = gltf.accessors?.[index]?.count
  return typeof count === "number" ? count : 0
}

export function facesOfGlb(bytes: Uint8Array): number | null {
  if (bytes.length < 20) {
    return null
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (
    view.getUint32(0, true) !== glbMagic ||
    view.getUint32(16, true) !== jsonChunk
  ) {
    return null
  }
  const length = view.getUint32(12, true)
  if (20 + length > bytes.length) {
    return null
  }
  let gltf: unknown
  try {
    gltf = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + length)))
  } catch {
    return null
  }
  if (!isGltf(gltf)) {
    return null
  }
  const parsed: Gltf = gltf
  const triangles = (parsed.meshes ?? []).flatMap(
    (mesh) => mesh.primitives ?? []
  )
  return triangles.reduce((sum, primitive) => {
    const mode = primitive.mode ?? 4
    if (mode !== 4) {
      return sum
    }
    const corners =
      primitive.indices === undefined
        ? countAt(parsed, primitive.attributes?.POSITION)
        : countAt(parsed, primitive.indices)
    return sum + Math.floor(corners / 3)
  }, 0)
}
