import { describe, expect, it } from "vitest"
import type { EffectRecipe } from "#effects/effect-recipe.contract"
import {
  effectRecipes,
  passedRecipes,
  readRecipes,
  recipeOf,
} from "#effects/effect-recipes"
import { passedRecipe } from "./passed-recipe"

const looks = [
  "buildings-ripple",
  "freeze-and-circle",
  "grow-giant",
  "many-copies",
  "melt-away",
  "pull-back-to-space",
  "push-into-eye",
  "scatter-petals",
  "still-in-the-street",
]

function variant(change: Record<string, unknown>): Record<string, unknown> {
  return { ...recipeOf("many-copies"), ...change }
}

function passedVariant(
  change: (recipe: EffectRecipe) => unknown
): Record<string, unknown> {
  return { "many-copies": change(passedRecipe("many-copies")) }
}

function cutsOf(recipe: EffectRecipe): number {
  return recipe.design.cuts.filter((window) => window.kind === "cut").length
}

describe("the effect recipes kept as data", () => {
  it("reads the nine looks, none passed and none with an adapter", () => {
    expect(
      effectRecipes.map(({ effect, passed, adapter }) => ({
        effect,
        passed,
        adapter,
      }))
    ).toEqual(looks.map((effect) => ({ effect, passed: false, adapter: null })))
    expect(passedRecipes).toEqual([])
  })

  it("names for each look the unit and the family it is designed from, with its whole chain", () => {
    for (const recipe of effectRecipes) {
      const { design } = recipe
      expect({ effect: recipe.effect, unit: design.unit }).toEqual({
        effect: recipe.effect,
        unit: recipe.effect,
      })
      expect(design.family).toBe("effects")
      expect(design.fit.prompt.length).toBeGreaterThan(0)
      expect(design.setPiece.length).toBeGreaterThan(0)
      expect(design.lastFrame.shows.length).toBeGreaterThan(0)
      expect(design.encode).toEqual({
        container: "mp4",
        codec: "h264",
        bitDepth: 8,
      })
      expect(recipe.seconds).toBeGreaterThanOrEqual(5)
      expect(recipe.seconds).toBeLessThanOrEqual(15)
      for (const window of design.cuts) {
        expect(window.max).toBeLessThanOrEqual(recipe.seconds + 0.05)
      }
      expect(recipe.endFrame.source).toBe("edit")
    }
  })

  it("keeps the fixed lengths, the cut plans and the sound beds of the reference looks", () => {
    const plans = Object.fromEntries(
      effectRecipes.map((recipe) => [
        recipe.effect,
        {
          seconds: recipe.seconds,
          cuts: cutsOf(recipe),
          sound: recipe.design.sound !== null,
        },
      ])
    )
    expect(plans).toEqual({
      "buildings-ripple": { seconds: 7, cuts: 0, sound: false },
      "freeze-and-circle": { seconds: 15, cuts: 1, sound: true },
      "grow-giant": { seconds: 10, cuts: 2, sound: true },
      "many-copies": { seconds: 7, cuts: 0, sound: false },
      "melt-away": { seconds: 7, cuts: 0, sound: true },
      "pull-back-to-space": { seconds: 10, cuts: 0, sound: true },
      "push-into-eye": { seconds: 7, cuts: 0, sound: true },
      "scatter-petals": { seconds: 5, cuts: 0, sound: true },
      "still-in-the-street": { seconds: 6, cuts: 0, sound: true },
    })
  })

  it("reads a passed recipe that carries its run and the proof of that run", () => {
    const [read] = readRecipes({ "many-copies": passedRecipe("many-copies") })
    expect(read).toMatchObject({
      passed: true,
      preview: { file: "many-copies.mp4" },
      proof: { judge: { verdict: "held" }, gate: { planted: "refused" } },
    })
  })

  it("refuses a passed recipe whose run reads outside its criteria", () => {
    const sources = passedVariant((recipe) => ({
      ...recipe,
      proof: recipe.proof && {
        ...recipe.proof,
        reading: { ...recipe.proof.reading, lastFrameLuma: 90, cuts: [3] },
      },
    }))
    expect(() => readRecipes(sources)).toThrow(
      /many-copies\.json passed on a run outside its criteria: cut: one at 3 s, outside every window, last frame: luma 90, against at most 40/
    )
  })

  it("refuses a run that took the balance under 2,000 credits", () => {
    const sources = passedVariant((recipe) => ({
      ...recipe,
      proof: recipe.proof && {
        ...recipe.proof,
        balance: { before: 2050, after: 1990 },
      },
    }))
    expect(() => readRecipes(sources)).toThrow(
      /many-copies\.json is invalid: proof\.balance\.after/
    )
  })

  it("refuses a judge that failed a criterion, and a gate that let its planted output pass", () => {
    const failed = passedVariant((recipe) => ({
      ...recipe,
      proof: recipe.proof && {
        ...recipe.proof,
        judge: { criteria: 13, failed: ["Dark end"], verdict: "held" },
      },
    }))
    expect(() => readRecipes(failed)).toThrow(
      /many-copies\.json is invalid: proof\.judge\.failed/
    )
    const planted = passedVariant((recipe) => ({
      ...recipe,
      proof: recipe.proof && {
        ...recipe.proof,
        gate: { positives: 1, planted: "held", verdict: "held" },
      },
    }))
    expect(() => readRecipes(planted)).toThrow(
      /many-copies\.json is invalid: proof\.gate\.planted/
    )
  })

  it("refuses a passed recipe with no proof, and a proof on a recipe not passed", () => {
    const unproven = passedVariant((recipe) => ({ ...recipe, proof: null }))
    expect(() => readRecipes(unproven)).toThrow(
      /many-copies\.json is invalid: proof/
    )
    const unpassed = passedVariant((recipe) => ({
      ...recipe,
      passed: false,
      preview: null,
    }))
    expect(() => readRecipes(unpassed)).toThrow(
      /many-copies\.json is invalid: proof/
    )
  })

  it("refuses an empty effect prompt, a length past 15 seconds and a look with no unit", () => {
    expect(() =>
      readRecipes({ "many-copies": variant({ prompt: "" }) })
    ).toThrow(/many-copies\.json is invalid: prompt/)
    expect(() =>
      readRecipes({ "many-copies": variant({ seconds: 16 }) })
    ).toThrow(/many-copies\.json is invalid: seconds/)
    const { unit: _, ...design } = recipeOf("many-copies").design
    expect(() => readRecipes({ "many-copies": variant({ design }) })).toThrow(
      /many-copies\.json is invalid: design\.unit/
    )
  })

  it("refuses a passed recipe with no run, and a run on a recipe not passed", () => {
    expect(() =>
      readRecipes({ "many-copies": variant({ passed: true }) })
    ).toThrow(/many-copies\.json is invalid: preview/)
    const preview = passedRecipe("many-copies").preview
    expect(() => readRecipes({ "many-copies": variant({ preview }) })).toThrow(
      /many-copies\.json is invalid: preview/
    )
  })

  it("refuses a file that names another effect", () => {
    expect(() => readRecipes({ "melt-away": variant({}) })).toThrow(
      /melt-away\.json names the effect many-copies/
    )
  })
})
