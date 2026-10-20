import { type Run, run, shareView } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { ownEntries, sharedEntries } from "@/screens/explore/explore-entries"
import { sharedOutputOf } from "@/screens/explore/share-api"

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

describe("Explore's outputs", () => {
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

  it("read a shared output from the gateway, with the address of its media", () => {
    const share = shareView.safeParse({
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
      createdAt: "2026-10-19T12:00:00.000Z",
      expiresAt: null,
    })
    const [entry] = sharedEntries(
      share.success ? [sharedOutputOf(share.data)] : []
    )

    expect(entry?.kind).toBe("video")
    expect(entry?.source).toEqual({
      kind: "share",
      shareId: "abc",
      src: "/share/abc/media/0",
    })
    expect(entry?.aspect).toEqual({ width: 1280, height: 720 })
    expect(shareView.safeParse({ id: "abc", path: "/share/abc" }).success).toBe(
      false
    )
  })
})
