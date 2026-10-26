import { assetId, type Run, runId } from "@rosesfield/contract"
import { appIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { gridSplitOf } from "@/screens/app/canvas-view"

function runOf(
  id: string,
  status: Run["status"],
  outputs: readonly string[]
): Run {
  return {
    id: runId.parse(id),
    appId: appIdFormat.parse("image"),
    status,
    inputs: { model: "flux", prompt: "a paper boat" },
    count: 4,
    aspectRatio: null,
    seed: null,
    outputs: outputs.map((one) => assetId.parse(one)),
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: "2026-10-26T10:00:00.000Z",
    finishedAt: null,
  }
}

const halfDone = runOf("1b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d01", "running", [
  "2b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d01",
  "2b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d02",
])
const newFailure = runOf("1b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d02", "failed", [])
const done = runOf("1b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d03", "done", [
  "2b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d03",
])
const oldFailure = runOf("1b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d04", "failed", [])

describe("an app's Grid", () => {
  it("keeps a run that still works as a card even after some of its images landed, and leaves its images out of the grid", () => {
    const split = gridSplitOf([halfDone, newFailure, done, oldFailure])
    expect(split.cards).toEqual([halfDone, newFailure])
    expect(split.results).toEqual([done, oldFailure])
  })
})
