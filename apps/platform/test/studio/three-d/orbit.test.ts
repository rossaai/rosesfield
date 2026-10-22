import { describe, expect, it } from "vitest"
import {
  cameraOf,
  type Gesture,
  keyed,
  pointerDown,
  pointerMove,
  pointerUp,
  startGesture,
  startOrbit,
  wheeled,
  zoomLimits,
} from "@/studio/three-d/orbit"

const size = 400

function drag(gesture: Gesture, id: number, x: number, y: number): Gesture {
  return pointerMove(gesture, id, { x, y }, size)
}

describe("the orbit gesture", () => {
  it("turns the model by the distance the finger moved, from where it was last", () => {
    let gesture = pointerDown(startGesture(), 1, { x: 100, y: 100 })
    gesture = drag(gesture, 1, 140, 100)
    const once = gesture.orbit.yaw
    gesture = drag(gesture, 1, 180, 100)
    expect(startOrbit.yaw - once).toBeCloseTo((40 * Math.PI) / size)
    expect(once - gesture.orbit.yaw).toBeCloseTo((40 * Math.PI) / size)
  })

  it("moves nothing when a pointer moves without being down", () => {
    const gesture = drag(startGesture(), 7, 300, 300)
    expect(gesture.orbit).toEqual(startOrbit)
  })

  it("zooms in when two fingers spread and out when they pinch", () => {
    let gesture = pointerDown(startGesture(), 1, { x: 100, y: 100 })
    gesture = pointerDown(gesture, 2, { x: 200, y: 100 })
    const spread = drag(gesture, 2, 300, 100)
    expect(spread.orbit.zoom).toBeCloseTo(startOrbit.zoom / 2)
    expect(spread.orbit.yaw).toBe(startOrbit.yaw)
    const pinched = drag(gesture, 2, 180, 100)
    expect(pinched.orbit.zoom).toBeGreaterThan(startOrbit.zoom)
  })

  it("keeps the view still when one of two fingers lifts and the other moves on", () => {
    let gesture = pointerDown(startGesture(), 1, { x: 100, y: 100 })
    gesture = pointerDown(gesture, 2, { x: 200, y: 100 })
    gesture = drag(gesture, 1, 20, 100)
    gesture = pointerUp(gesture, 2)
    const before = gesture.orbit.yaw
    gesture = drag(gesture, 1, 21, 100)
    expect(before - gesture.orbit.yaw).toBeCloseTo(Math.PI / size)
  })

  it("stops turning the view over the top and under the bottom", () => {
    let gesture = pointerDown(startGesture(), 1, { x: 0, y: 0 })
    gesture = drag(gesture, 1, 0, 5000)
    expect(gesture.orbit.pitch).toBeLessThan(Math.PI / 2)
    gesture = drag(gesture, 1, 0, -10_000)
    expect(gesture.orbit.pitch).toBeGreaterThan(-Math.PI / 2)
  })

  it("zooms out on a scroll down and stays inside the zoom limits", () => {
    expect(wheeled(startOrbit, 100).zoom).toBeGreaterThan(startOrbit.zoom)
    expect(wheeled(startOrbit, -100).zoom).toBeLessThan(startOrbit.zoom)
    expect(wheeled(startOrbit, 100_000).zoom).toBe(zoomLimits.max)
    expect(wheeled(startOrbit, -100_000).zoom).toBe(zoomLimits.min)
  })

  it("turns and zooms from the arrow keys and plus and minus, and ignores other keys", () => {
    expect(keyed(startOrbit, "ArrowLeft")?.yaw).toBeGreaterThan(startOrbit.yaw)
    expect(keyed(startOrbit, "ArrowUp")?.pitch).toBeGreaterThan(
      startOrbit.pitch
    )
    expect(keyed(startOrbit, "+")?.zoom).toBeLessThan(startOrbit.zoom)
    expect(keyed(startOrbit, "-")?.zoom).toBeGreaterThan(startOrbit.zoom)
    expect(keyed(startOrbit, "a")).toBeNull()
  })

  it("places the eye at the zoom times the radius from the center", () => {
    const camera = cameraOf(startOrbit, [1, 2, 3], 2, 1)
    const distance = Math.hypot(
      camera.eye[0] - 1,
      camera.eye[1] - 2,
      camera.eye[2] - 3
    )
    expect(distance).toBeCloseTo(startOrbit.zoom * 2)
  })
})
