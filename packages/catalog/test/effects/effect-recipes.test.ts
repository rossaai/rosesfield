import { describe, expect, it } from "vitest"
import { effectRecipes, readRecipes, recipeOf } from "#effects/effect-recipes"

const preview = {
  file: "grow-wings.mp4",
  runId: "5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e",
  seed: 7,
  resolution: "720p",
  aspectRatio: "9:16",
  workflowHash:
    "ed50011518009bb7519b8d93286267699aeb1c3863c4fe89c4ade3470cf8673f",
}

function variant(change: Record<string, unknown>): Record<string, unknown> {
  return { ...recipeOf("grow-wings"), ...change }
}

describe("the effect recipes kept as data", () => {
  it("reads every recipe file, each named for its effect, with no adapter", () => {
    expect(effectRecipes.length).toBeGreaterThanOrEqual(13)
    for (const recipe of effectRecipes) {
      expect({ effect: recipe.effect, adapter: recipe.adapter }).toEqual({
        effect: recipe.effect,
        adapter: null,
      })
    }
  })

  it("reads a passed recipe that carries the run it passed with", () => {
    const [read] = readRecipes({
      "grow-wings": variant({ review: "passed", preview }),
    })
    expect(read?.preview?.runId).toBe(preview.runId)
  })

  it("refuses an effect prompt left empty outside a control", () => {
    expect(() =>
      readRecipes({ "grow-wings": variant({ prompt: "" }) })
    ).toThrow(/grow-wings\.json is invalid: prompt/)
  })

  it("refuses a passed recipe with no run, and a run on a recipe in review", () => {
    expect(() =>
      readRecipes({ "grow-wings": variant({ review: "passed" }) })
    ).toThrow(/preview/)
    expect(() => readRecipes({ "grow-wings": variant({ preview }) })).toThrow(
      /preview/
    )
  })

  it("refuses a file that names another effect", () => {
    expect(() => readRecipes({ "melt-away": variant({}) })).toThrow(
      /melt-away\.json names the effect grow-wings/
    )
  })
})
