import { type Run, run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  historyGridItems,
  historyShownOf,
} from "@/screens/history/history-grid-items"

function runOf(change: Partial<Record<keyof Run, unknown>>): Run {
  return run.parse({
    id: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01",
    appId: "image",
    status: "done",
    inputs: { prompt: "a red rose" },
    count: 2,
    aspectRatio: "9:16",
    seed: 1,
    outputs: [
      "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f01",
      "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f02",
    ],
    progress: 1,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-19T12:00:00.000Z",
    finishedAt: "2026-10-19T12:00:05.000Z",
    ...change,
  })
}

describe("History's grid", () => {
  it("shows every output of each run at the run's shape, with its run", () => {
    const tall = runOf({})
    const none = runOf({
      id: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e02",
      status: "failed",
      outputs: [],
    })
    const items = historyGridItems([tall, none])
    expect(items.map((item) => item.assetId)).toEqual(tall.outputs)
    expect(items.every((item) => item.run?.id === tall.id)).toBe(true)
    expect(items[0]?.aspect).toEqual({ width: 9, height: 16 })
  })

  it("lists runs with no media as rows in the grid view, so a failed or working tab is never blank", () => {
    const failed = runOf({ status: "failed", outputs: [] })
    expect(historyShownOf([failed], "grid")).toBe("rows")
    expect(historyShownOf([runOf({}), failed], "grid")).toBe("grid")
    expect(historyShownOf([runOf({})], "list")).toBe("rows")
    expect(historyShownOf([], "grid")).toBe("empty")
  })
})
