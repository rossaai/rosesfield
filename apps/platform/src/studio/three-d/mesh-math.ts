export type Matrix = readonly number[]

export type Vector = readonly [number, number, number]

function at(values: ArrayLike<number>, index: number): number {
  return values[index] ?? 0
}

export function identity(): Matrix {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
}

export function multiply(a: Matrix, b: Matrix): Matrix {
  const out: number[] = []
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0
      for (let step = 0; step < 4; step += 1) {
        sum += at(a, step * 4 + row) * at(b, column * 4 + step)
      }
      out.push(sum)
    }
  }
  return out
}

export type NodeTransform = {
  matrix?: readonly number[] | undefined
  translation?: readonly number[] | undefined
  rotation?: readonly number[] | undefined
  scale?: readonly number[] | undefined
}

export function matrixOfNode(node: NodeTransform): Matrix {
  if (node.matrix !== undefined && node.matrix.length === 16) {
    return [...node.matrix]
  }
  const t = node.translation ?? [0, 0, 0]
  const q = node.rotation ?? [0, 0, 0, 1]
  const s = node.scale ?? [1, 1, 1]
  const [qx, qy, qz, qw] = [at(q, 0), at(q, 1), at(q, 2), q[3] ?? 1]
  const [scaleX, scaleY, scaleZ] = [s[0] ?? 1, s[1] ?? 1, s[2] ?? 1]
  return [
    (1 - 2 * (qy * qy + qz * qz)) * scaleX,
    2 * (qx * qy + qz * qw) * scaleX,
    2 * (qx * qz - qy * qw) * scaleX,
    0,
    2 * (qx * qy - qz * qw) * scaleY,
    (1 - 2 * (qx * qx + qz * qz)) * scaleY,
    2 * (qy * qz + qx * qw) * scaleY,
    0,
    2 * (qx * qz + qy * qw) * scaleZ,
    2 * (qy * qz - qx * qw) * scaleZ,
    (1 - 2 * (qx * qx + qy * qy)) * scaleZ,
    0,
    at(t, 0),
    at(t, 1),
    at(t, 2),
    1,
  ]
}

export function transformPoints(
  points: Float32Array,
  matrix: Matrix
): Float32Array {
  const out = new Float32Array(points.length)
  for (let item = 0; item + 2 < points.length; item += 3) {
    const x = at(points, item)
    const y = at(points, item + 1)
    const z = at(points, item + 2)
    for (let row = 0; row < 3; row += 1) {
      out[item + row] =
        at(matrix, row) * x +
        at(matrix, 4 + row) * y +
        at(matrix, 8 + row) * z +
        at(matrix, 12 + row)
    }
  }
  return out
}

export function normalMatrixOf(m: Matrix): Matrix {
  const [a, b, c] = [at(m, 0), at(m, 1), at(m, 2)]
  const [d, e, f] = [at(m, 4), at(m, 5), at(m, 6)]
  const [g, h, i] = [at(m, 8), at(m, 9), at(m, 10)]
  const det = a * (e * i - f * h) - d * (b * i - c * h) + g * (b * f - c * e)
  const sign = det < 0 ? -1 : 1
  return [
    e * i - f * h,
    c * h - b * i,
    b * f - c * e,
    f * g - d * i,
    a * i - c * g,
    c * d - a * f,
    d * h - e * g,
    b * g - a * h,
    a * e - b * d,
  ].map((value) => value * sign)
}

export function normalizeEach(vectors: Float32Array): Float32Array {
  for (let item = 0; item + 2 < vectors.length; item += 3) {
    const x = at(vectors, item)
    const y = at(vectors, item + 1)
    const z = at(vectors, item + 2)
    const length = Math.hypot(x, y, z)
    if (length > 0) {
      vectors[item] = x / length
      vectors[item + 1] = y / length
      vectors[item + 2] = z / length
    } else {
      vectors[item + 2] = 1
    }
  }
  return vectors
}

export function transformNormals(
  normals: Float32Array,
  normalMatrix: Matrix
): Float32Array {
  const out = new Float32Array(normals.length)
  for (let item = 0; item + 2 < normals.length; item += 3) {
    const x = at(normals, item)
    const y = at(normals, item + 1)
    const z = at(normals, item + 2)
    for (let row = 0; row < 3; row += 1) {
      out[item + row] =
        at(normalMatrix, row * 3) * x +
        at(normalMatrix, row * 3 + 1) * y +
        at(normalMatrix, row * 3 + 2) * z
    }
  }
  return normalizeEach(out)
}

export function perspective(
  fieldOfView: number,
  aspect: number,
  near: number,
  far: number
): Matrix {
  const focal = 1 / Math.tan(fieldOfView / 2)
  const depth = 1 / (near - far)
  return [
    focal / aspect,
    0,
    0,
    0,
    0,
    focal,
    0,
    0,
    0,
    0,
    (far + near) * depth,
    -1,
    0,
    0,
    2 * far * near * depth,
    0,
  ]
}

function minus(a: Vector, b: Vector): Vector {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function cross(a: Vector, b: Vector): Vector {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function unit(a: Vector): Vector {
  const length = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / length, a[1] / length, a[2] / length]
}

function dot(a: Vector, b: Vector): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function lookAt(eye: Vector, target: Vector, up: Vector): Matrix {
  const back = unit(minus(eye, target))
  const right = unit(cross(up, back))
  const top = cross(back, right)
  return [
    right[0],
    top[0],
    back[0],
    0,
    right[1],
    top[1],
    back[1],
    0,
    right[2],
    top[2],
    back[2],
    0,
    -dot(right, eye),
    -dot(top, eye),
    -dot(back, eye),
    1,
  ]
}
