import { type Run, run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  filterEntries,
  ownEntries,
  sharedEntries,
} from "@/screens/explore/explore-entries"
import { readShare } from "@/screens/explore/share-api"

const outputId = "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f01"

function runOf(change: Partial<Record<keyof Run, unknown>>): Run {
  return run.parse({
    id: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01",
    appId: "image",
    status: "done",
    inputs: { prompt: "a red rose" },
    count: 1,
    aspectRatio: "1:1",
    seed: 1,
    outputs: [outputId],
    progress: 1,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: { amount: 0.006, currency: "USD" },
    origin: "live",
    failure: null,
    createdAt: "2026-10-19T12:00:00.000Z",
    finishedAt: "2026-10-19T12:00:05.000Z",
    ...change,
  })
}

describe("Explore's results", () => {
  it("show only real, finished runs that made an output", () => {
    const real = runOf({})
    const entries = ownEntries([
      real,
      runOf({ id: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e02", origin: "demo" }),
      runOf({ id: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e03", status: "failed" }),
      runOf({ id: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e04", outputs: [] }),
    ])

    expect(entries.map((entry) => entry.run.id)).toEqual([real.id])
    expect(entries[0]?.source).toEqual({ kind: "own", assetId: outputId })
  })

  it("read a shared result from the gateway, with the address of its media", () => {
    const share = readShare({
      id: "abc",
      path: "/share/abc",
      run: runOf({ outputs: [] }),
      media: [
        {
          index: 0,
          kind: "video",
          mime: "video/mp4",
          width: 1280,
          height: 720,
          durationSeconds: 5,
        },
      ],
      poster: "/share/abc/poster",
      createdAt: "2026-10-19T12:00:00.000Z",
      expiresAt: null,
    })
    const [entry] = sharedEntries(share === null ? [] : [share])

    expect(entry?.kind).toBe("video")
    expect(entry?.source).toEqual({
      kind: "share",
      shareId: "abc",
      src: "/share/abc/media/0",
      poster: "/share/abc/poster",
    })
    expect(entry?.aspect).toEqual({ width: 1280, height: 720 })
    expect(readShare({ id: "abc", path: "/share/abc" })).toBeNull()
  })

  it("filter by the kind of output", () => {
    const entries = ownEntries([runOf({})])
    expect(filterEntries(entries, "image")).toHaveLength(1)
    expect(filterEntries(entries, "video")).toEqual([])
    expect(filterEntries(entries, "all")).toHaveLength(1)
  })
})
