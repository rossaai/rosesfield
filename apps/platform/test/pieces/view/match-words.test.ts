import { run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { runAppName, runModel } from "@/pieces/run/run-facts"
import { holdsEveryWord, runHoldsWords } from "@/pieces/view/match-words"

const made = run.parse({
  id: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01",
  appId: "image",
  status: "done",
  inputs: { prompt: "A red door in fog" },
  count: 1,
  aspectRatio: "1:1",
  seed: 1,
  outputs: [],
  progress: 1,
  engine: {
    adapter: "comfy-cloud",
    models: ["checkpoints/juniper-xl.safetensors"],
    workflowHash: null,
  },
  cost: null,
  origin: "live",
  failure: null,
  createdAt: "2026-10-21T12:00:00.000Z",
  finishedAt: "2026-10-21T12:00:03.000Z",
})

describe("the one search match", () => {
  it("reads the run's prompt, its app's name and its model's name", () => {
    expect(runAppName(made)).toBe("Image")
    expect(runModel(made, findCatalogApp(made.appId))).toBe("juniper-xl")
  })

  it("keeps a run whose prompt, app and model hold every word, in any case and any order", () => {
    expect(runHoldsWords(made, "")).toBe(true)
    expect(runHoldsWords(made, "door")).toBe(true)
    expect(runHoldsWords(made, "FOG red")).toBe(true)
    expect(runHoldsWords(made, "door image juniper")).toBe(true)
    expect(runHoldsWords(made, "  juniper   fog ")).toBe(true)
  })

  it("drops a run when one word is in none of them", () => {
    expect(runHoldsWords(made, "door sky")).toBe(false)
    expect(runHoldsWords(made, "video")).toBe(false)
  })

  it("keeps what Library matched before, a phrase from the prompt and the app's name", () => {
    expect(runHoldsWords(made, "red door")).toBe(true)
    expect(runHoldsWords(made, "a red door in fog image")).toBe(true)
  })

  it("matches every word across the texts it is given, for a list with no run", () => {
    expect(holdsEveryWord(["Relight", "Image"], "light img")).toBe(false)
    expect(holdsEveryWord(["Relight", "Image"], "light ima")).toBe(true)
  })
})
