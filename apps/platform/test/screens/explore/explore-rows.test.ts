import { type Run, run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import {
  appRows,
  modelRows,
  presetsOf,
  promoEntries,
  rowFloor,
  rowLimit,
  visualEntries,
} from "@/screens/explore/explore-rows"
import type { ExploreEntry, VisualEntry } from "@/screens/explore/explore-tile"

let counter = 0

function runOf(change: Partial<Record<keyof Run, unknown>>): Run {
  counter += 1
  const tail = String(counter).padStart(12, "0")
  return run.parse({
    id: `2c3d4e5f-6a7b-4c8d-9e0f-${tail}`,
    appId: "image",
    status: "done",
    inputs: { prompt: "a red rose" },
    count: 1,
    aspectRatio: "1:1",
    seed: 1,
    outputs: [`3d4e5f6a-7b8c-4d9e-8f0a-${tail}`],
    progress: 1,
    engine: {
      adapter: "comfy-workflow",
      models: ["model-a.safetensors"],
      workflowHash: null,
    },
    cost: { amount: 0.006, currency: "USD" },
    origin: "live",
    failure: null,
    createdAt: "2026-10-19T12:00:00.000Z",
    finishedAt: "2026-10-19T12:00:05.000Z",
    ...change,
  })
}

function entryOf(
  change: Partial<Record<keyof Run, unknown>>,
  kind: ExploreEntry["kind"] = "image"
): VisualEntry {
  const made = runOf(change)
  return {
    key: `run-${made.id}`,
    run: made,
    kind: kind === "audio" ? "image" : kind,
    aspect: { width: 9, height: 16 },
    source: { kind: "own", assetId: made.outputs[0] ?? "" },
  }
}

function withModel(file: string, appId = "image"): VisualEntry {
  return entryOf({
    appId,
    engine: { adapter: "comfy-workflow", models: [file], workflowHash: null },
  })
}

function moveOf(cameraMove: string): VisualEntry {
  return entryOf({ appId: "video", inputs: { cameraMove } }, "video")
}

describe("Explore's rows", () => {
  it("keep image and video results with a shape, and leave audio out", () => {
    const image = entryOf({})
    const audio: ExploreEntry = { ...entryOf({}), kind: "audio" }
    const shapeless: ExploreEntry = { ...entryOf({}), aspect: undefined }

    expect(visualEntries([image, audio, shapeless])).toEqual([image])
  })

  it("give a model a row once it has enough results", () => {
    const small = Array.from({ length: rowFloor - 1 }, () =>
      withModel("model-b.safetensors")
    )
    const large = Array.from({ length: rowFloor + 1 }, () =>
      withModel("model-c.safetensors", "video")
    )
    const rows = modelRows([...small, ...large])

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      kind: "model",
      model: "model-c",
      appId: "video",
    })
    expect(rows[0]?.kind === "model" ? rows[0].entries : []).toHaveLength(
      rowFloor + 1
    )
  })

  it("show no more model rows than the limit", () => {
    const entries = Array.from({ length: rowLimit + 2 }, (_, index) =>
      Array.from({ length: rowFloor }, () => withModel(`model-${index}.x`))
    ).flat()

    expect(modelRows(entries)).toHaveLength(rowLimit)
  })

  it("turn an app's camera moves into presets, one tile per move", () => {
    const video = findCatalogApp("video")
    const entries = [
      moveOf("push-in"),
      moveOf("push-in"),
      moveOf("pull-out"),
      moveOf("auto"),
    ]
    const presets = video === null ? [] : presetsOf(video, entries)

    expect(presets.map((preset) => preset.key)).toEqual([
      "video-push-in",
      "video-pull-out",
    ])
    expect(presets[0]?.name).toBe("Push in")
    expect(presets[0]?.entry).toBe(entries[0])
  })

  it("give an app with presets a preset row, others a result row", () => {
    const moves = ["push-in", "pull-out", "static"].map(moveOf)
    const images = Array.from({ length: rowFloor }, () => entryOf({}))
    const rows = appRows([...moves, ...images])

    expect(rows.map((row) => row.kind).sort()).toEqual(["app", "presets"])
    expect(appRows(images.slice(0, rowFloor - 1))).toEqual([])
  })

  it("put one card per app in the promo row", () => {
    const first = entryOf({})
    const promos = promoEntries([first, entryOf({}), moveOf("static")])

    expect(promos.map((promo) => promo.app.id)).toEqual(["image", "video"])
    expect(promos[0]?.entry).toBe(first)
  })
})
