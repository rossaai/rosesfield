import { type Run, run } from "@rosesfield/contract"
import { describe, expect, it, vi } from "vitest"
import type { VisualEntry } from "@/screens/explore/explore-tile"
import { stepsOf } from "@/viewer/result-viewer"
import { clockOf, pictureWidthOf, stageAspectOf } from "@/viewer/viewer-video"

function entryOf(index: number): VisualEntry {
  const id = `2c3d4e5f-6a7b-4c8d-9e0f-00000000000${index}`
  const made: Run = run.parse({
    id,
    appId: "image",
    status: "done",
    inputs: {},
    count: 1,
    aspectRatio: "1:1",
    seed: 1,
    outputs: [],
    progress: 1,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-19T12:00:00.000Z",
    finishedAt: null,
  })
  return {
    key: `run-${id}`,
    run: made,
    kind: "image",
    aspect: { width: 1, height: 1 },
    source: { kind: "share", shareId: id, src: `/share/${id}/media/0` },
  }
}

describe("the result viewer", () => {
  it("steps to the result before and after the one shown", () => {
    const list = [entryOf(1), entryOf(2), entryOf(3)]
    const onStep = vi.fn()
    const middle = stepsOf(list, entryOf(2), onStep)

    middle.next?.onSelect()
    middle.previous?.onSelect()
    expect(onStep.mock.calls.map(([entry]) => entry.key)).toEqual([
      list[2]?.key,
      list[0]?.key,
    ])
    expect(stepsOf(list, entryOf(1), onStep).previous).toBeUndefined()
    expect(stepsOf(list, entryOf(3), onStep).next).toBeUndefined()
  })

  it("gives a wide video frame room for a control row above and below the picture", () => {
    const wide = { width: 16, height: 9 }
    const frameWidth = 1000
    const rowHeight = 40

    expect(stageAspectOf(wide, "image", true)).toEqual(wide)
    const video = stageAspectOf(wide, "video", true)
    const room = ((video.height - wide.height) / video.width) * frameWidth
    expect(video.width).toBe(16)
    expect(Math.round(room)).toBeGreaterThanOrEqual(2 * rowHeight)
    expect(room).toBeLessThan(3 * rowHeight)
  })

  it("gives a phone video frame room for one control row and its gutters", () => {
    const wide = { width: 16, height: 9 }
    const phoneWidth = 320
    const gutter = 16
    const rowHeight = 40
    const video = stageAspectOf(wide, "video", false)
    const frameHeight = (video.height / video.width) * phoneWidth
    const picture = phoneWidth - 2 * gutter

    expect(frameHeight - rowHeight).toBeGreaterThanOrEqual(
      (picture * wide.height) / wide.width
    )
  })

  it("sizes the picture alone, with the control rows taken out of the frame", () => {
    const wide = { width: 16, height: 9 }

    expect(pictureWidthOf(wide, true)).toBe(
      "min(100cqw, (100cqh - 2 * var(--spacing-s12)) * 16 / 9)"
    )
    expect(pictureWidthOf(wide, false)).toBe(
      "min(100cqw - 2 * var(--spacing-s5), (100cqh - var(--spacing-s12)) * 16 / 9)"
    )
  })

  it("reads a video's time as minutes and seconds", () => {
    expect(clockOf(0)).toBe("0:00")
    expect(clockOf(7.9)).toBe("0:07")
    expect(clockOf(125)).toBe("2:05")
    expect(clockOf(Number.NaN)).toBe("0:00")
  })
})
