import { type AppDefinition, appDefinition } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { pricedRunOf } from "#domain/priced-run"
import { imageApp, modesApp, referenceId } from "../sample"

function keyOf(inputs: Record<string, string>) {
  return pricedRunOf({
    app: modesApp,
    inputs,
    form: null,
    count: 1,
    aspectRatio: null,
    workflowHash: null,
  })
}

describe("the measured price key of a mode that bounds its model", () => {
  it("keys the two modes apart, so one mode's measured cost never prices the other", () => {
    expect(keyOf({ mode: "views", model: "open-views" })).not.toEqual(
      keyOf({ mode: "portrait", model: "open-portrait" })
    )
    expect(keyOf({ mode: "views", model: "open-views" }).model).toBe(
      "open-views"
    )
  })
})

function photoKeyOf(
  app: AppDefinition,
  references: readonly (typeof referenceId)[]
) {
  return pricedRunOf({
    app,
    inputs: { prompt: "a door", references: [...references] },
    form: null,
    count: 1,
    aspectRatio: null,
    workflowHash: null,
  })
}

const needsPhoto = appDefinition.parse({
  ...imageApp(),
  inputs: imageApp().inputs.map((input) =>
    input.name === "references" ? { ...input, presence: "required" } : input
  ),
})

describe("the measured price key of a photo input", () => {
  it("prices a required photo before you add it as the run with one, so a tile shows its price before the photo", () => {
    expect(photoKeyOf(needsPhoto, [])).toEqual(
      photoKeyOf(needsPhoto, [referenceId])
    )
    expect(photoKeyOf(needsPhoto, [referenceId, referenceId])).not.toEqual(
      photoKeyOf(needsPhoto, [referenceId])
    )
  })

  it("keeps an optional photo's count, so a run with none and a run with one price apart", () => {
    expect(photoKeyOf(imageApp(), [])).not.toEqual(
      photoKeyOf(imageApp(), [referenceId])
    )
  })
})

function graphKeyOf(workflowHash: string | null) {
  return pricedRunOf({
    app: imageApp(),
    inputs: { prompt: "a door" },
    form: null,
    count: 1,
    aspectRatio: null,
    workflowHash,
  })
}

describe("the measured price key of a graph", () => {
  it("keys two graphs apart at the same settings, so a run of one never prices the other", () => {
    expect(graphKeyOf("graph-before")).not.toEqual(graphKeyOf("graph-after"))
    expect(graphKeyOf("graph-before").model).toBe(
      graphKeyOf("graph-after").model
    )
  })

  it("adds nothing to the key of a run that names no graph, so a hosted model keeps its measured runs", () => {
    expect(graphKeyOf(null).settings).not.toContain("workflowHash")
  })
})
