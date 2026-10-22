import {
  lookAt,
  type Matrix,
  multiply,
  perspective,
  type Vector,
} from "@/studio/three-d/mesh-math"

export type Orbit = {
  yaw: number
  pitch: number
  zoom: number
}

export type Point = {
  x: number
  y: number
}

export type Gesture = {
  orbit: Orbit
  pointers: ReadonlyMap<number, Point>
}

export const fieldOfView = Math.PI / 4

const fitZoom = 1.1 / Math.sin(fieldOfView / 2)

export const zoomLimits = { min: 1.2, max: 10 } as const

const pitchLimit = 1.5

const keyTurn = Math.PI / 12

const keyZoom = 1.2

const wheelRate = 0.002

export const startOrbit: Orbit = { yaw: Math.PI / 6, pitch: 0.3, zoom: fitZoom }

export function startGesture(): Gesture {
  return { orbit: startOrbit, pointers: new Map() }
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

export function turned(
  orbit: Orbit,
  dx: number,
  dy: number,
  size: number
): Orbit {
  const perPixel = Math.PI / Math.max(size, 1)
  return {
    ...orbit,
    yaw: orbit.yaw - dx * perPixel,
    pitch: clamp(orbit.pitch + dy * perPixel, -pitchLimit, pitchLimit),
  }
}

function tilted(orbit: Orbit, by: number): Orbit {
  return { ...orbit, pitch: clamp(orbit.pitch + by, -pitchLimit, pitchLimit) }
}

export function zoomed(orbit: Orbit, factor: number): Orbit {
  if (!Number.isFinite(factor) || factor <= 0) {
    return orbit
  }
  return {
    ...orbit,
    zoom: clamp(orbit.zoom * factor, zoomLimits.min, zoomLimits.max),
  }
}

function spanOf(pointers: ReadonlyMap<number, Point>): number | null {
  const [first, second] = [...pointers.values()]
  if (first === undefined || second === undefined) {
    return null
  }
  return Math.hypot(first.x - second.x, first.y - second.y)
}

export function pointerDown(
  gesture: Gesture,
  id: number,
  point: Point
): Gesture {
  const pointers = new Map(gesture.pointers)
  pointers.set(id, point)
  return { ...gesture, pointers }
}

export function pointerMove(
  gesture: Gesture,
  id: number,
  point: Point,
  size: number
): Gesture {
  const last = gesture.pointers.get(id)
  if (last === undefined) {
    return gesture
  }
  const pointers = new Map(gesture.pointers)
  pointers.set(id, point)
  if (gesture.pointers.size === 1) {
    return {
      orbit: turned(gesture.orbit, point.x - last.x, point.y - last.y, size),
      pointers,
    }
  }
  const before = spanOf(gesture.pointers)
  const after = spanOf(pointers)
  const isPinch = before !== null && after !== null && before > 0 && after > 0
  return {
    orbit: isPinch ? zoomed(gesture.orbit, before / after) : gesture.orbit,
    pointers,
  }
}

export function pointerUp(gesture: Gesture, id: number): Gesture {
  if (!gesture.pointers.has(id)) {
    return gesture
  }
  const pointers = new Map(gesture.pointers)
  pointers.delete(id)
  return { ...gesture, pointers }
}

export function wheeled(orbit: Orbit, deltaY: number): Orbit {
  return zoomed(orbit, Math.exp(deltaY * wheelRate))
}

export function keyed(orbit: Orbit, key: string): Orbit | null {
  switch (key) {
    case "ArrowLeft":
      return { ...orbit, yaw: orbit.yaw + keyTurn }
    case "ArrowRight":
      return { ...orbit, yaw: orbit.yaw - keyTurn }
    case "ArrowUp":
      return tilted(orbit, keyTurn)
    case "ArrowDown":
      return tilted(orbit, -keyTurn)
    case "+":
    case "=":
      return zoomed(orbit, 1 / keyZoom)
    case "-":
      return zoomed(orbit, keyZoom)
    default:
      return null
  }
}

export type Camera = {
  matrix: Matrix
  eye: Vector
}

export function cameraOf(
  orbit: Orbit,
  center: Vector,
  radius: number,
  aspect: number
): Camera {
  const distance = radius * orbit.zoom
  const eye: Vector = [
    center[0] + distance * Math.cos(orbit.pitch) * Math.sin(orbit.yaw),
    center[1] + distance * Math.sin(orbit.pitch),
    center[2] + distance * Math.cos(orbit.pitch) * Math.cos(orbit.yaw),
  ]
  const near = Math.max(distance - radius * 1.5, distance * 0.01)
  const far = distance + radius * 1.5
  const projection = perspective(fieldOfView, Math.max(aspect, 0.01), near, far)
  return { matrix: multiply(projection, lookAt(eye, center, [0, 1, 0])), eye }
}
