import type { AppDefinition } from "@rosesfield/contract"
import { AppDefinitionInvalidError } from "#app-definition-invalid.error"
import { effectsApp } from "#effects/app"
import type { EffectPreset } from "#effects/effect-preset.contract"
import { heldEffectPresets, keptPresets } from "#effects/effect-presets"
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
  return canTryDrafts(reach)
    ? [...passed, ...recipes.filter((recipe) => !recipe.passed)]
    : passed
}

export function offeredPresets(
  presets: readonly EffectPreset[],
  reach: ServerReach
): readonly EffectPreset[] {
  return canTryDrafts(reach) ? presets : keptPresets(presets)
}

export function offeredEffectsApp(
  recipes: readonly EffectRecipe[],
  reach: ServerReach,
  presets: readonly EffectPreset[] = heldEffectPresets
): AppDefinition {
  const app = effectsApp(
    offeredRecipes(recipes, reach),
    offeredPresets(presets, reach)
  )
  const [read] = readApps([{ folder: effectsFolder, app }])
  if (read === undefined) {
    throw new AppDefinitionInvalidError({
      folder: effectsFolder,
      reason: "the offered effects did not make an app",
    })
  }
  return read
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
