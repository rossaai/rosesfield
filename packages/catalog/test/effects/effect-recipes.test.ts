import { describe, expect, it } from "vitest"
import {
  effectRecipes,
  passedRecipes,
  readRecipes,
  recipeOf,
} from "#effects/effect-recipes"

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
  it("reads the 12 candidate files, none passed and none with an adapter", () => {
    expect(
      effectRecipes.map(({ effect, passed, adapter }) => ({
        effect,
        passed,
        adapter,
      }))
    ).toEqual(
      [
        "buildings-ripple",
        "fish-in-the-air",
        "freeze-and-circle",
        "grow-giant",
        "grow-wings",
        "liquid-metal",
        "many-copies",
        "melt-away",
        "pull-back-to-space",
        "push-into-eye",
        "scatter-petals",
        "still-in-the-street",
      ].map((effect) => ({ effect, passed: false, adapter: null }))
    )
    expect(passedRecipes).toEqual([])
  })

  it("reads a passed recipe that carries the run it passed with", () => {
    const [read] = readRecipes({
      "grow-wings": variant({ passed: true, preview }),
    })
    expect(read).toMatchObject({
      passed: true,
      preview: { runId: preview.runId },
    })
  })

  it("refuses an empty effect prompt", () => {
    expect(() =>
      readRecipes({ "grow-wings": variant({ prompt: "" }) })
    ).toThrow(/grow-wings\.json is invalid: prompt/)
  })

  it("refuses a passed recipe with no run, and a run on a recipe not passed", () => {
    expect(() =>
      readRecipes({ "grow-wings": variant({ passed: true }) })
    ).toThrow(/grow-wings\.json is invalid: preview/)
    expect(() => readRecipes({ "grow-wings": variant({ preview }) })).toThrow(
      /grow-wings\.json is invalid: preview/
    )
  })

  it("refuses a file that names another effect", () => {
    expect(() => readRecipes({ "melt-away": variant({}) })).toThrow(
      /melt-away\.json names the effect grow-wings/
    )
  })
})
