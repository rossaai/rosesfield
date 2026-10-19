import { type Run, run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { inputRowsOf, shownInputsOf } from "@/pieces/run/run-inputs"

function voiceRun(inputs: Run["inputs"]): Run {
  return runOf("voice", inputs, {})
}

function runOf(
  appId: string,
  inputs: Run["inputs"],
  change: Partial<Record<keyof Run, unknown>>
): Run {
  return run.parse({
    id: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e02",
    appId,
    status: "done",
    inputs,
    count: 1,
    aspectRatio: null,
    seed: null,
    outputs: [],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: "2026-10-17T09:00:00.000Z",
    finishedAt: "2026-10-17T09:00:03.000Z",
    ...change,
  })
}

describe("shownInputsOf", () => {
  it("shows only the inputs the run used and leaves out empty ones", () => {
    const voice = findCatalogApp("voice")
    expect(voice).not.toBeNull()
    if (voice === null) {
      return
    }
    const shown = shownInputsOf(
      voice,
      voiceRun({
        mode: "model",
        script: "Read this slowly",
        language: "en",
        recording: [],
        expression: 0.5,
        seed: 42,
      })
    ).map((input) => input.name)
    expect(shown).toEqual(["mode", "script", "language", "expression"])
  })
})

describe("inputRowsOf", () => {
  it("lists the model, the seed, the format and the count beside the prompt", () => {
    const image = findCatalogApp("image")
    expect(image).not.toBeNull()
    if (image === null) {
      return
    }
    const rows = inputRowsOf(
      image,
      runOf(
        "image",
        { prompt: "A red cup", model: "z-image-turbo" },
        { seed: 42, count: 2, aspectRatio: "16:9" }
      )
    )
    expect(rows.map((row) => row.key)).toEqual([
      "prompt",
      "model",
      "seed",
      "aspectRatio",
      "count",
    ])
    expect(rows.find((row) => row.key === "aspectRatio")?.value).toBe("16:9")
    expect(rows.find((row) => row.key === "count")?.value).toBe("2")
  })
})
