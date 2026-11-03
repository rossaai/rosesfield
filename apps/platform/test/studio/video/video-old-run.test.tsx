import { findApp } from "@rosesfield/catalog"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { appListing, run, startRunBodyFor } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { inputRowsOf } from "@/pieces/run/run-inputs"
import { bodyOf, valuesFromRun } from "@/screens/app/app-form"
import { tabOfInputs } from "@/studio/video/video-tabs"

const definition = findApp("video")
const video = appListing.parse(definition)

const ltx: CatalogModel = {
  id: "ltx-2-5",
  kind: "graph",
  maker: "comfy-cloud",
  name: "LTX 2.5",
  nameKey: null,
  task: "text-to-video",
  tags: [],
  form: null,
}

const oldRun = run.parse({
  id: "4a5b6c7d-8e9f-4a0b-8c1d-2e3f4a5b6c7d",
  appId: "video",
  status: "done",
  inputs: {
    prompt: "A kite over a hill",
    model: "ltx-2-5",
    length: 5,
    cameraMove: "push-in",
    resolution: "480p",
    sound: "on",
  },
  count: 1,
  aspectRatio: "16:9",
  seed: 42,
  outputs: ["5b6c7d8e-9f0a-4b1c-8d2e-3f4a5b6c7d8e"],
  progress: 1,
  engine: {
    adapter: "comfy-workflow",
    models: ["ltx-2.5-22b-distilled-transformer-bf16.safetensors"],
    workflowHash: null,
  },
  cost: { amount: 0.1, currency: "USD" },
  origin: "live",
  failure: null,
  createdAt: "2026-10-20T12:00:00.000Z",
  finishedAt: "2026-10-20T12:01:00.000Z",
})

describe("a Video run made before Video lost its camera move", () => {
  it("opens in Recreate with its prompt, model, length and seed, and leaves the move out", () => {
    const values = valuesFromRun(video, oldRun)
    expect(values.inputs).toMatchObject({
      prompt: "A kite over a hill",
      model: "ltx-2-5",
      length: 5,
      seed: 42,
    })
    expect(values.inputs).not.toHaveProperty("cameraMove")
    expect(tabOfInputs(values.inputs, ltx, video)).toBe("text-image")
  })

  it("sends a body Video accepts when you generate it again", () => {
    const body = bodyOf(video, valuesFromRun(video, oldRun))
    expect(body.inputs).not.toHaveProperty("cameraMove")
    if (definition === null) {
      throw new Error("no Video app")
    }
    expect(startRunBodyFor(definition).safeParse(body).success).toBe(true)
  })

  it("shows its settings on the run screen without a camera move row", () => {
    const keys = inputRowsOf(video, oldRun).map((row) => row.key)
    expect(keys).toContain("length")
    expect(keys).not.toContain("cameraMove")
  })
})
