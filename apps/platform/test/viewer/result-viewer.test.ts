import { type Run, run } from "@rosesfield/contract"
import { describe, expect, it, vi } from "vitest"
import type { VisualEntry } from "@/screens/explore/explore-tile"
import { stepsOf } from "@/viewer/result-viewer"
import { clockOf, stageAspectOf } from "@/viewer/viewer-video"

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

  it("gives a video frame room for its controls under the media", () => {
    const wide = { width: 16, height: 9 }

    expect(stageAspectOf(wide, "image")).toEqual(wide)
    const video = stageAspectOf(wide, "video")
    expect(video.width).toBe(16)
    expect(video.height).toBeGreaterThan(9)
    expect(video.height).toBeLessThan(10)
  })

  it("reads a video's time as minutes and seconds", () => {
    expect(clockOf(0)).toBe("0:00")
    expect(clockOf(7.9)).toBe("0:07")
    expect(clockOf(125)).toBe("2:05")
    expect(clockOf(Number.NaN)).toBe("0:00")
  })
})
