import {
  bytesOfView,
  chunksOf,
  type Glb,
  isJson,
  itemOf,
  type Json,
  listOf,
  numberOr,
  numbersOf,
  readFloats,
  readIndices,
} from "@/studio/three-d/glb-buffers"
import {
  identity,
  type Matrix,
  matrixOfNode,
  multiply,
  normalizeEach,
  normalMatrixOf,
  transformNormals,
  transformPoints,
} from "@/studio/three-d/mesh-math"

export type MeshImage = {
  bytes: Uint8Array
  mime: string
}

export type MeshPart = {
  positions: Float32Array
  normals: Float32Array
  uvs: Float32Array | null
  colors: Float32Array | null
  indices: Uint32Array
  color: readonly [number, number, number, number]
  texture: MeshImage | null
}

export type MeshScene = {
  parts: MeshPart[]
  center: readonly [number, number, number]
  radius: number
}

const triangles = 4
const maxDepth = 64

const supportedExtensions: ReadonlySet<string> = new Set([
  "KHR_materials_unlit",
  "KHR_mesh_quantization",
])

const white = [1, 1, 1, 1] as const

function at(values: ArrayLike<number>, index: number): number {
  return values[index] ?? 0
}

export function normalsOf(
  positions: Float32Array,
  indices: Uint32Array
): Float32Array {
  const out = new Float32Array(positions.length)
  for (let item = 0; item + 2 < indices.length; item += 3) {
    const a = at(indices, item) * 3
    const b = at(indices, item + 1) * 3
    const c = at(indices, item + 2) * 3
    const u = [0, 1, 2].map(
      (axis) => at(positions, b + axis) - at(positions, a + axis)
    )
    const v = [0, 1, 2].map(
      (axis) => at(positions, c + axis) - at(positions, a + axis)
    )
    const face = [
      at(u, 1) * at(v, 2) - at(u, 2) * at(v, 1),
      at(u, 2) * at(v, 0) - at(u, 0) * at(v, 2),
      at(u, 0) * at(v, 1) - at(u, 1) * at(v, 0),
    ]
    for (const corner of [a, b, c]) {
      for (let axis = 0; axis < 3; axis += 1) {
        out[corner + axis] = at(out, corner + axis) + at(face, axis)
      }
    }
  }
  return normalizeEach(out)
}

function colorsOf(glb: Glb, index: unknown): Float32Array | null {
  if (index === undefined) {
    return null
  }
  const four = readFloats(glb, index, 4)
  if (four !== null) {
    return four
  }
  const three = readFloats(glb, index, 3)
  if (three === null) {
    return null
  }
  const count = three.length / 3
  const out = new Float32Array(count * 4)
  for (let item = 0; item < count; item += 1) {
    out.set(three.subarray(item * 3, item * 3 + 3), item * 4)
    out[item * 4 + 3] = 1
  }
  return out
}

function imageOf(glb: Glb, textureIndex: unknown): MeshImage | null {
  const texture = itemOf(glb.json, "textures", textureIndex)
  const image = itemOf(glb.json, "images", texture?.source)
  if (image === null || typeof image.mimeType !== "string") {
    return null
  }
  const bytes = bytesOfView(glb, image.bufferView)
  return bytes === null ? null : { bytes, mime: image.mimeType }
}

function materialOf(
  glb: Glb,
  index: unknown
): Pick<MeshPart, "color" | "texture"> {
  const material = itemOf(glb.json, "materials", index)
  const pbr = material?.pbrMetallicRoughness
  if (!isJson(pbr)) {
    return { color: white, texture: null }
  }
  const factor = listOf(pbr.baseColorFactor)
  const base = pbr.baseColorTexture
  return {
    color: [
      numberOr(factor[0], 1),
      numberOr(factor[1], 1),
      numberOr(factor[2], 1),
      numberOr(factor[3], 1),
    ],
    texture: isJson(base) ? imageOf(glb, base.index) : null,
  }
}

function partOf(glb: Glb, primitive: Json, world: Matrix): MeshPart | null {
  const attributes = primitive.attributes
  if (
    !isJson(attributes) ||
    numberOr(primitive.mode, triangles) !== triangles
  ) {
    return null
  }
  const local = readFloats(glb, attributes.POSITION, 3)
  if (local === null) {
    return null
  }
  const indices = readIndices(glb, primitive.indices, local.length / 3)
  if (indices === null || indices.length < 3) {
    return null
  }
  const positions = transformPoints(local, world)
  const normals = readFloats(glb, attributes.NORMAL, 3)
  const uvs = readFloats(glb, attributes.TEXCOORD_0, 2)
  const colors = colorsOf(glb, attributes.COLOR_0)
  return {
    positions,
    normals:
      normals === null || normals.length !== local.length
        ? normalsOf(positions, indices)
        : transformNormals(normals, normalMatrixOf(world)),
    uvs: uvs !== null && uvs.length * 3 === local.length * 2 ? uvs : null,
    colors:
      colors !== null && colors.length * 3 === local.length * 4 ? colors : null,
    indices,
    ...materialOf(glb, primitive.material),
  }
}

function partsOfMesh(glb: Glb, index: unknown, world: Matrix): MeshPart[] {
  const mesh = itemOf(glb.json, "meshes", index)
  return listOf(mesh?.primitives).flatMap((primitive) => {
    const part = isJson(primitive) ? partOf(glb, primitive, world) : null
    return part === null ? [] : [part]
  })
}

function nodeMatrix(node: Json): Matrix {
  return matrixOfNode({
    matrix: numbersOf(node.matrix),
    translation: numbersOf(node.translation),
    rotation: numbersOf(node.rotation),
    scale: numbersOf(node.scale),
  })
}

function walk(
  glb: Glb,
  index: unknown,
  parent: Matrix,
  depth: number,
  walked: Set<Json>,
  parts: MeshPart[]
): void {
  const node = itemOf(glb.json, "nodes", index)
  if (node === null || depth > maxDepth || walked.has(node)) {
    return
  }
  walked.add(node)
  const world = multiply(parent, nodeMatrix(node))
  parts.push(...partsOfMesh(glb, node.mesh, world))
  for (const child of listOf(node.children)) {
    walk(glb, child, world, depth + 1, walked, parts)
  }
}

function rootsOf(json: Json): unknown[] {
  const scene = itemOf(json, "scenes", numberOr(json.scene, 0))
  if (scene !== null) {
    return listOf(scene.nodes)
  }
  const nodes = listOf(json.nodes)
  const children = new Set(
    nodes.flatMap((node) => (isJson(node) ? listOf(node.children) : []))
  )
  return nodes.map((_, index) => index).filter((index) => !children.has(index))
}

function boundsOf(
  parts: readonly MeshPart[]
): Pick<MeshScene, "center" | "radius"> {
  const low = [Infinity, Infinity, Infinity]
  const high = [-Infinity, -Infinity, -Infinity]
  for (const part of parts) {
    for (let item = 0; item + 2 < part.positions.length; item += 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        const value = at(part.positions, item + axis)
        low[axis] = Math.min(at(low, axis), value)
        high[axis] = Math.max(at(high, axis), value)
      }
    }
  }
  const center = [0, 1, 2].map((axis) => (at(low, axis) + at(high, axis)) / 2)
  const size = [0, 1, 2].map((axis) => at(high, axis) - at(low, axis))
  const radius = Math.hypot(at(size, 0), at(size, 1), at(size, 2)) / 2
  return {
    center: [at(center, 0), at(center, 1), at(center, 2)],
    radius: Number.isFinite(radius) && radius > 0 ? radius : 1,
  }
}

function isSupported(json: Json): boolean {
  return listOf(json.extensionsRequired).every(
    (name) => typeof name === "string" && supportedExtensions.has(name)
  )
}

export function parseGlb(bytes: ArrayBuffer): MeshScene | null {
  const glb = chunksOf(bytes)
  if (glb === null || !isSupported(glb.json)) {
    return null
  }
  const parts: MeshPart[] = []
  const walked = new Set<Json>()
  for (const root of rootsOf(glb.json)) {
    walk(glb, root, identity(), 0, walked, parts)
  }
  return parts.length === 0 ? null : { parts, ...boundsOf(parts) }
}
