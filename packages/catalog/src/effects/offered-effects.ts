import type { AppDefinition } from "@rosesfield/contract"
import { AppDefinitionInvalidError } from "#app-definition-invalid.error"
import { effectsApp } from "#effects/app"
import type { EffectRecipe } from "#effects/effect-recipe.contract"
import { effectRecipes } from "#effects/effect-recipes"
import { readApps } from "#list-apps"

export type ServerReach = {
  mode: "owner" | "public"
  lock: "local" | "token" | "none"
}

const effectsFolder = "effects"

export function canTryDrafts(reach: ServerReach): boolean {
  return reach.mode === "owner" && reach.lock === "local"
}

export function offeredRecipes(
  recipes: readonly EffectRecipe[],
  reach: ServerReach
): readonly EffectRecipe[] {
  const passed = recipes.filter((recipe) => recipe.passed)
  const drafts = recipes.filter(
    (recipe) => !recipe.passed && recipe.guide === null
  )
  return canTryDrafts(reach) ? [...passed, ...drafts] : passed
}

export function offeredEffectsApp(
  recipes: readonly EffectRecipe[],
  reach: ServerReach
): AppDefinition {
  const [app] = readApps([
    { folder: effectsFolder, app: effectsApp(offeredRecipes(recipes, reach)) },
  ])
  if (app === undefined) {
    throw new AppDefinitionInvalidError({
      folder: effectsFolder,
      reason: "the offered effects did not make an app",
    })
  }
  return app
}

export function withOfferedEffects(
  apps: readonly AppDefinition[],
  reach: ServerReach
): readonly AppDefinition[] {
  if (!canTryDrafts(reach)) {
    return apps
  }
  const offered = offeredEffectsApp(effectRecipes, reach)
  return apps.map((app) => (app.id === effectsFolder ? offered : app))
}
