import { asset, type Run, run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { gridItemOf } from "@/screens/library/result-grid"
import { libraryGridItems } from "@/screens/library/use-library"

const runId = "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01"

const wideRun: Run = run.parse({
  id: runId,
  appId: "video",
  status: "done",
  inputs: { prompt: "a red rose" },
  count: 1,
  aspectRatio: "16:9",
  seed: 1,
  outputs: [],
  progress: 1,
  engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
  cost: null,
  origin: "live",
  failure: null,
  createdAt: "2026-10-19T12:00:00.000Z",
  finishedAt: "2026-10-19T12:00:05.000Z",
})

function assetOf(
  id: string,
  size: { width: number; height: number } | null,
  sourceRunId: string | null
) {
  return asset.parse({
    id,
    kind: "video",
    mime: "video/mp4",
    bytes: 10,
    width: size?.width ?? null,
    height: size?.height ?? null,
    durationSeconds: 5,
    sourceRunId,
    createdAt: "2026-10-19T12:00:05.000Z",
  })
}

describe("a grid item", () => {
  it("stands at its own shape when the asset knows its size", () => {
    const tall = assetOf(
      "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f01",
      { width: 720, height: 1280 },
      runId
    )
    expect(gridItemOf(tall, wideRun).aspect).toEqual({
      width: 720,
      height: 1280,
    })
  })

  it("takes its run's shape when the asset does not know its size, and a square with no run", () => {
    const unsized = assetOf("3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f02", null, runId)
    expect(gridItemOf(unsized, wideRun).aspect).toEqual({
      width: 16,
      height: 9,
    })
    expect(gridItemOf(unsized, null).aspect).toEqual({ width: 1, height: 1 })
  })

  it("carries the run that made it, and none for an upload or a run not loaded", () => {
    const made = assetOf("3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f03", null, runId)
    const uploaded = assetOf("3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f04", null, null)
    const orphan = assetOf(
      "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f05",
      null,
      "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e99"
    )
    const items = libraryGridItems({
      shown: [made, uploaded, orphan],
      runsById: new Map([[runId, wideRun]]),
    })
    expect(items.map((item) => item.run?.id ?? null)).toEqual([
      runId,
      null,
      null,
    ])
    expect(items.map((item) => item.assetId)).toEqual([
      made.id,
      uploaded.id,
      orphan.id,
    ])
  })
})
