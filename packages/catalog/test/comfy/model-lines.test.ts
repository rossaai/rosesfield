import { describe, expect, it } from "vitest"
import { comfyCopy } from "#comfy/copy.en"
import { modelsForApp } from "#comfy/list-models"
import { modelFactsData } from "#comfy/model-facts"
import { findApp, listApps } from "#list-apps"

const lineKey = /^comfy\.model\.[a-zA-Z0-9]+\.line$/

const describedKeys = Object.values(modelFactsData.models).flatMap((row) =>
  "key" in row.line ? [row.line.key] : []
)

describe("the one line each model shows in the picker", () => {
  it("reaches the catalog as a row of the generated comfy copy file for every line a fact row describes, and the file holds no model line without one", () => {
    expect(describedKeys.length).toBeGreaterThan(5)
    for (const key of describedKeys) {
      expect(Object.hasOwn(comfyCopy, key), key).toBe(true)
    }
    const copied = Object.keys(comfyCopy).filter((key) => lineKey.test(key))
    expect([...copied].sort()).toEqual([...describedKeys].sort())
  })

  it("is, for every graph of every app, a line a fact row describes with its source, or none, never the app's own words about the graph", () => {
    const shown = listApps().flatMap((app) =>
      modelsForApp(app, []).map((model) => ({
        id: `${app.id}/${model.id}`,
        key: model.facts?.lineKey ?? null,
      }))
    )
    expect(shown.length).toBeGreaterThan(10)
    for (const one of shown) {
      if (one.key !== null) {
        expect(describedKeys, one.id).toContain(one.key)
      }
    }
    const image = findApp("image")
    if (image === null) {
      throw new Error("the catalog lacks Image")
    }
    const edit = modelsForApp(image, []).find(
      (model) => model.id === "qwen-image-edit-2511"
    )
    expect(edit?.kind).toBe("graph")
    expect(edit?.facts?.lineKey).toBeNull()
  })
})
