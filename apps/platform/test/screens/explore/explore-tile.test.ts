import { run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  type ExploreEntry,
  entryModel,
  recreateTargetOf,
} from "@/screens/explore/explore-tile"

const made = run.parse({
  id: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01",
  appId: "image",
  status: "done",
  inputs: { prompt: "a red rose" },
  count: 1,
  aspectRatio: "1:1",
  seed: 1,
  outputs: ["3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f01"],
  progress: 1,
  engine: {
    adapter: "comfy-workflow",
    models: ["model-a.safetensors"],
    workflowHash: null,
  },
  cost: null,
  origin: "live",
  failure: null,
  createdAt: "2026-10-19T12:00:00.000Z",
  finishedAt: null,
})

function entryOf(source: ExploreEntry["source"]): ExploreEntry {
  return {
    key: "one",
    run: made,
    kind: "image",
    aspect: { width: 1, height: 1 },
    source,
  }
}

describe("a result tile", () => {
  it("recreates a shared result from its share and your own from its run", () => {
    const shared = entryOf({ kind: "share", shareId: "abc", src: "/x" })
    const own = entryOf({ kind: "own", assetId: "asset" })

    expect(recreateTargetOf(shared)).toEqual({ search: { share: "abc" } })
    expect(recreateTargetOf(own)).toEqual({ search: { from: made.id } })
  })

  it("recreates a bundled example by carrying its prompt, its inputs and its format into the app", () => {
    const bundled = entryOf({ kind: "showcase", src: "/media/rose.webp" })

    expect(recreateTargetOf(bundled)).toEqual({
      draft: {
        prompt: "a red rose",
        assetIds: [],
        characterIds: [],
        inputs: { prompt: "a red rose" },
        aspectRatio: "1:1",
      },
    })
  })

  it("names the model the run used", () => {
    expect(entryModel(entryOf({ kind: "own", assetId: "asset" }))).toBe(
      "model-a"
    )
  })
})
