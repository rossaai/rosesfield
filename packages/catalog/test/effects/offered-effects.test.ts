import { type InputDefinition, startRunBodyFor } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { effectRecipes, passedRecipes, recipeOf } from "#effects/effect-recipes"
import {
  canTryDrafts,
  offeredEffectsApp,
  offeredRecipes,
  type ServerReach,
  withOfferedEffects,
} from "#effects/offered-effects"
import { listApps } from "#list-apps"
import { passedRecipe, passedRun } from "./passed-recipe"

const local: ServerReach = { mode: "owner", lock: "local" }
const token: ServerReach = { mode: "owner", lock: "token" }
const visitor: ServerReach = { mode: "public", lock: "none" }

const recipes = [
  recipeOf("buildings-ripple"),
  passedRecipe("melt-away"),
  recipeOf("many-copies"),
  passedRecipe("push-into-eye"),
]

function effectsOf(
  inputs: readonly InputDefinition[]
): Extract<InputDefinition, { type: "choice" }> | undefined {
  return inputs.find(
    (one): one is Extract<InputDefinition, { type: "choice" }> =>
      one.name === "effect" && one.type === "choice"
  )
}

describe("the effects a server offers", () => {
  it("lets only an owner server on the local lock try drafts", () => {
    expect(canTryDrafts(local)).toBe(true)
    expect(canTryDrafts(token)).toBe(false)
    expect(canTryDrafts(visitor)).toBe(false)
  })

  it("offers the passed effects first and the drafts after them on the local lock", () => {
    expect(offeredRecipes(recipes, local).map((one) => one.effect)).toEqual([
      "melt-away",
      "push-into-eye",
      "buildings-ripple",
      "many-copies",
    ])
  })

  it.each([
    ["an owner token", token],
    ["public mode", visitor],
  ])("offers only the passed effects behind %s", (_, reach) => {
    expect(offeredRecipes(recipes, reach).map((one) => one.effect)).toEqual([
      "melt-away",
      "push-into-eye",
    ])
  })

  it("opens the app with the passed looks first and starts a draft on the local lock", () => {
    const app = offeredEffectsApp(effectRecipes, local)
    expect(app.closedKey).toBeNull()
    expect(effectsOf(app.inputs)?.options.map((one) => one.value)).toEqual([
      ...passedRecipes.map((one) => one.effect),
      ...effectRecipes.filter((one) => !one.passed).map((one) => one.effect),
    ])
    const body = startRunBodyFor(app)
    expect(
      body.safeParse({
        inputs: { effect: "many-copies", image: [passedRun.runId] },
      }).success
    ).toBe(true)
  })

  it.each([
    ["an owner token", token],
    ["public mode", visitor],
  ])("refuses a draft behind %s", (_, reach) => {
    const app = offeredEffectsApp(recipes, reach)
    expect(
      startRunBodyFor(app).safeParse({
        inputs: { effect: "many-copies", image: [passedRun.runId] },
      }).success
    ).toBe(false)
    const shipped = offeredEffectsApp(effectRecipes, reach)
    expect(shipped.closedKey).toBeNull()
    expect(effectsOf(shipped.inputs)?.options.map((one) => one.value)).toEqual(
      passedRecipes.map((one) => one.effect)
    )
  })

  it("swaps in the offered effects app only on the local lock", () => {
    const apps = listApps()
    expect(withOfferedEffects(apps, token)).toBe(apps)
    expect(withOfferedEffects(apps, visitor)).toBe(apps)
    const served = withOfferedEffects(apps, local)
    const effects = served.find((one) => one.id === "effects")
    expect(effects?.closedKey).toBeNull()
    expect(served.filter((one) => one.id !== "effects")).toEqual(
      apps.filter((one) => one.id !== "effects")
    )
  })
})
