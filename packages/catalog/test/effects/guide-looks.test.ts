import { appDefinition, type RunInputs } from "@rosesfield/contract"
import { parseComfyWorkflow, resolveBinding } from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { effectsApp } from "#effects/app"
import { effectAgentNotes, isFinalRun } from "#effects/effect-agent"
import type { EffectRecipe } from "#effects/effect-recipe.contract"
import {
  effectRecipes,
  passedRecipes,
  readRecipes,
  recipeOf,
} from "#effects/effect-recipes"
import { offeredEffectsApp } from "#effects/offered-effects"

const guided = ["flip-into-a-new-place", "ticket-wipe", "grab-and-run"]

const assetId = assetIdFormat.parse("0d9c8b7a-6f5e-4d3c-9b2a-1f0e9d8c7b6a")

function passedLook(effect: string): EffectRecipe {
  const passed = passedRecipes[0]
  if (passed === undefined) {
    throw new Error("No look passed")
  }
  return {
    ...recipeOf(effect),
    passed: true,
    preview: passed.preview,
    proof: passed.proof,
  }
}

function resolved(effect: string, inputs: RunInputs) {
  const app = appDefinition.parse(effectsApp([passedLook(effect)]))
  return parseComfyWorkflow(resolveBinding(app.engine, { effect, ...inputs }))
}

function effectsOf(app: { inputs: readonly { name: string }[] }): string[] {
  const input = app.inputs.find((one) => one.name === "effect")
  return input !== undefined &&
    "options" in input &&
    Array.isArray(input.options)
    ? input.options.map((option: { value: string }) => option.value)
    : []
}

describe("a look that follows a guide", () => {
  it("is one recipe of the effects, with its guide and its sha256", () => {
    for (const effect of guided) {
      const recipe = recipeOf(effect)
      expect(recipe.guide?.sha256).toMatch(/^[0-9a-f]{64}$/)
      expect(recipe.passed).toBe(false)
    }
    expect(effectRecipes.filter((one) => one.guide !== null)).toHaveLength(3)
  })

  it.each([
    ["public", { mode: "public", lock: "none" }],
    ["owner with a token", { mode: "owner", lock: "token" }],
    ["owner on this computer", { mode: "owner", lock: "local" }],
  ] as const)(
    "stays out of the effects a %s server lists while no run of it passed",
    (_, reach) => {
      const app = offeredEffectsApp(effectRecipes, reach)
      for (const effect of guided) {
        expect(effectsOf(app)).not.toContain(effect)
      }
      expect(effectAgentNotes(app)).not.toContain("ticket-wipe")
    }
  )

  it("refuses a guide look with an end frame the guide already sets", () => {
    const recipe = recipeOf("ticket-wipe")
    expect(() =>
      readRecipes(
        {
          "ticket-wipe": {
            ...recipe,
            endFrame: { source: "dark", luma: 10, strength: 1 },
          },
        },
        []
      )
    ).toThrow(/guide/)
  })

  it("refuses a length other than its guide's", () => {
    const recipe = recipeOf("grab-and-run")
    expect(() =>
      readRecipes({ "grab-and-run": { ...recipe, seconds: 6 } }, [])
    ).toThrow(/as long as its guide/)
  })

  it("runs the guide graph with your photo, its prompt and its guide as a file the engine holds, never as an input of the run", () => {
    const recipe = recipeOf("grab-and-run")
    const bound = resolved("grab-and-run", {
      image: [assetId],
      resolution: "480p",
    })
    expect(bound.workflow["200"]).toBeDefined()
    expect(bound.bindings).toContainEqual({
      from: "file",
      name: "grab-and-run.mp4",
      path: ["199", "inputs", "file"],
    })
    const scene = bound.bindings.find(
      (one) => one.from === "input" && one.name === "effect"
    )
    expect(scene?.from === "input" && scene.map?.["grab-and-run"]).toBe(
      recipe.prompt
    )
    const app = appDefinition.parse(effectsApp([passedLook("grab-and-run")]))
    expect(app.inputs.map((input) => input.name)).not.toContain("guide")
  })

  it("asks for your photo only and offers 480p and 720p", () => {
    const app = appDefinition.parse(
      effectsApp(
        [passedRecipes[0], passedLook("ticket-wipe")].flatMap((one) =>
          one === undefined ? [] : [one]
        )
      )
    )
    const prompt = app.inputs.find((input) => input.name === "prompt")
    expect(prompt?.type === "prompt" && prompt.when?.[0]).toEqual({
      input: "effect",
      is: [passedRecipes[0]?.effect],
    })
    const resolution = app.inputs.find((input) => input.name === "resolution")
    expect(
      resolution?.type === "choice" && resolution.bounds?.[0]?.values
    ).toEqual(["480p", "720p"])
  })
})

describe("the agent's draft and final", () => {
  it("holds a run of an effect above 480p for the person's yes, and no other app's", () => {
    expect(isFinalRun("effects", { resolution: "720p" })).toBe(true)
    expect(isFinalRun("effects", { resolution: "480p" })).toBe(false)
    expect(isFinalRun("motion", { resolution: "720p" })).toBe(false)
  })

  it("names each listed effect's need and no engine word", () => {
    const app = appDefinition.parse(effectsApp([passedLook("grab-and-run")]))
    const notes = effectAgentNotes(app)
    expect(notes).toContain("grab-and-run: ")
    expect(notes).not.toMatch(/guide|depth|adapter|preset|sha256/i)
  })
})
