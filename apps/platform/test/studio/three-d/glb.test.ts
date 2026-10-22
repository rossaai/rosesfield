import { describe, expect, it } from "vitest"
import { normalsOf, parseGlb } from "@/studio/three-d/glb"
import { glbOf, pixel, triangleGlb } from "./glb-bytes"

describe("parseGlb", () => {
  it("places each mesh where its node puts it and frames the whole model", () => {
    const scene = parseGlb(triangleGlb())
    expect(scene?.parts).toHaveLength(1)
    expect([...(scene?.parts[0]?.positions ?? [])]).toEqual([
      10, 0, 0, 11, 0, 0, 10, 1, 0,
    ])
    expect(scene?.center).toEqual([10.5, 0.5, 0])
    expect(scene?.radius).toBeCloseTo(Math.SQRT1_2)
  })

  it("reads the indices, the base color and the embedded texture", () => {
    const part = parseGlb(triangleGlb())?.parts[0]
    expect([...(part?.indices ?? [])]).toEqual([0, 1, 2])
    expect(part?.color).toEqual([0.5, 0.25, 1, 1])
    expect(part?.texture?.mime).toBe("image/png")
    expect([...(part?.texture?.bytes ?? [])]).toEqual([...pixel])
  })

  it("makes a normal for each corner when the file has none", () => {
    const part = parseGlb(triangleGlb())?.parts[0]
    expect([...(part?.normals ?? [])]).toEqual([0, 0, 1, 0, 0, 1, 0, 0, 1])
  })

  it("opens nothing that is not a GLB", () => {
    expect(parseGlb(new TextEncoder().encode("solid cube").buffer)).toBeNull()
    expect(parseGlb(new ArrayBuffer(0))).toBeNull()
  })

  it("opens nothing that needs an extension the viewer cannot read", () => {
    const draco = triangleGlb({
      extensionsRequired: ["KHR_draco_mesh_compression"],
    })
    expect(parseGlb(draco)).toBeNull()
  })

  it("opens nothing whose accessor reads past its buffer", () => {
    const long = triangleGlb({
      accessors: [
        { bufferView: 0, componentType: 5126, count: 30, type: "VEC3" },
        { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" },
      ],
    })
    expect(parseGlb(long)).toBeNull()
  })

  it("opens nothing whose offsets, stride or count no buffer can hold", () => {
    const positions = { bufferView: 0, componentType: 5126, type: "VEC3" }
    const indices = {
      bufferView: 1,
      componentType: 5123,
      count: 3,
      type: "SCALAR",
    }
    const corners = { buffer: 0, byteOffset: 0, byteLength: 36 }
    const order = { buffer: 0, byteOffset: 36, byteLength: 8 }
    const broken = [
      { accessors: [{ ...positions, count: 3, byteOffset: -4 }, indices] },
      {
        bufferViews: [{ ...corners, byteOffset: -4, byteLength: 40 }, order],
      },
      {
        accessors: [{ ...positions, count: 2 ** 31 }, indices],
        bufferViews: [{ ...corners, byteStride: 0 }, order],
      },
      { bufferViews: [{ ...corners, byteStride: -12 }, order] },
      { accessors: [{ ...positions, count: 2.5 }, indices] },
    ]
    for (const extra of broken) {
      expect(() => parseGlb(triangleGlb(extra))).not.toThrow()
      expect(parseGlb(triangleGlb(extra))).toBeNull()
    }
  })

  it("opens nothing whose indices point past its corners", () => {
    const json = {
      asset: { version: "2.0" },
      nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
      accessors: [
        { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
        { bufferView: 1, componentType: 5121, count: 3, type: "SCALAR" },
      ],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: 36 },
        { buffer: 0, byteOffset: 36, byteLength: 3 },
      ],
    }
    const bin = new Uint8Array(40)
    bin.set([0, 1, 9], 36)
    expect(parseGlb(glbOf(json, bin))).toBeNull()
  })
})

describe("normalsOf", () => {
  it("points each face normal out of the face it lights", () => {
    const positions = new Float32Array([0, 0, 0, 0, 1, 0, 1, 0, 0])
    const normals = normalsOf(positions, new Uint32Array([0, 1, 2]))
    expect([...normals]).toEqual([0, 0, -1, 0, 0, -1, 0, 0, -1])
  })
})
