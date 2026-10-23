import { describe, expect, it } from "vitest"
import {
  lookAt,
  matrixOfNode,
  multiply,
  normalMatrixOf,
  transformNormals,
  transformPoints,
} from "@/studio/three-d/mesh-math"

function close(values: ArrayLike<number>): number[] {
  return Array.from(values, (value) => Math.round(value * 1e6) / 1e6 + 0)
}

describe("the mesh math", () => {
  it("turns a point a quarter about the vertical axis from a node's rotation", () => {
    const half = Math.SQRT1_2
    const turn = matrixOfNode({ rotation: [0, half, 0, half] })
    const point = transformPoints(new Float32Array([1, 0, 0]), turn)
    expect(close(point)).toEqual([0, 0, -1])
  })

  it("scales, then turns, then moves a point, in the order glTF names", () => {
    const node = matrixOfNode({
      translation: [1, 2, 3],
      scale: [2, 2, 2],
    })
    const point = transformPoints(new Float32Array([1, 1, 1]), node)
    expect(close(point)).toEqual([3, 4, 5])
  })

  it("keeps a normal at right angles to its face under a turn and a stretch", () => {
    const angle = Math.PI / 12
    const stretch = matrixOfNode({
      rotation: [0, 0, Math.sin(angle), Math.cos(angle)],
      scale: [4, 1, 1],
    })
    const face = new Float32Array([1, 1, 0])
    const along = new Float32Array([1, -1, 0])
    const normal = transformNormals(face, normalMatrixOf(stretch))
    const edge = transformPoints(along, stretch)
    const dot =
      (normal[0] ?? 0) * (edge[0] ?? 0) + (normal[1] ?? 0) * (edge[1] ?? 0)
    expect(Math.abs(dot)).toBeLessThan(1e-6)
  })

  it("puts the eye at the origin of the view", () => {
    const view = lookAt([0, 0, 5], [0, 0, 0], [0, 1, 0])
    const eye = transformPoints(new Float32Array([0, 0, 5]), view)
    expect(close(eye)).toEqual([0, 0, 0])
    const target = transformPoints(new Float32Array([0, 0, 0]), view)
    expect(close(target)).toEqual([0, 0, -5])
  })

  it("applies the right matrix first", () => {
    const move = matrixOfNode({ translation: [1, 0, 0] })
    const grow = matrixOfNode({ scale: [3, 3, 3] })
    const both = multiply(move, grow)
    const point = transformPoints(new Float32Array([1, 0, 0]), both)
    expect(close(point)).toEqual([4, 0, 0])
  })
})
