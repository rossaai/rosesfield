import { AppDefinitionInvalidError } from "#app-definition-invalid.error"
import {
  type EffectRecipe,
  effectRecipe,
} from "#effects/effect-recipe.contract"
import { readingFailures } from "#effects/reading-failures"
import buildingsRipple from "./recipes/buildings-ripple.json"
import freezeAndCircle from "./recipes/freeze-and-circle.json"
import growGiant from "./recipes/grow-giant.json"
import manyCopies from "./recipes/many-copies.json"
import meltAway from "./recipes/melt-away.json"
import pullBackToSpace from "./recipes/pull-back-to-space.json"
import pushIntoEye from "./recipes/push-into-eye.json"
import scatterPetals from "./recipes/scatter-petals.json"
import stillInTheStreet from "./recipes/still-in-the-street.json"

const files: Readonly<Record<string, unknown>> = {
  "buildings-ripple": buildingsRipple,
  "freeze-and-circle": freezeAndCircle,
  "grow-giant": growGiant,
  "many-copies": manyCopies,
  "melt-away": meltAway,
  "pull-back-to-space": pullBackToSpace,
  "push-into-eye": pushIntoEye,
  "scatter-petals": scatterPetals,
  "still-in-the-street": stillInTheStreet,
}

export function readRecipes(
  sources: Readonly<Record<string, unknown>>
): EffectRecipe[] {
  return Object.entries(sources).map(([file, source]) => {
    const parsed = effectRecipe.safeParse(source)
    if (!parsed.success) {
      throw new AppDefinitionInvalidError({
        folder: "effects",
        reason: `the recipe ${file}.json is invalid: ${parsed.error.issues
          .map((issue) => `${issue.path.join(".")} ${issue.message}`)
          .join(", ")}`,
      })
    }
    if (parsed.data.effect !== file) {
      throw new AppDefinitionInvalidError({
        folder: "effects",
        reason: `the recipe ${file}.json names the effect ${parsed.data.effect}`,
      })
    }
    const { proof, preview } = parsed.data
    const failures =
      proof === null || preview === null
        ? []
        : readingFailures(parsed.data, proof.reading, preview)
    if (failures.length > 0) {
      throw new AppDefinitionInvalidError({
        folder: "effects",
        reason: `the recipe ${file}.json passed on a run outside its criteria: ${failures.join(", ")}`,
      })
    }
    return parsed.data
  })
}

export const effectRecipes: readonly EffectRecipe[] = readRecipes(files)

export const passedRecipes: readonly EffectRecipe[] = effectRecipes.filter(
  (recipe) => recipe.passed
)

export function recipeOf(effect: string): EffectRecipe {
  const found = effectRecipes.find((recipe) => recipe.effect === effect)
  if (found === undefined) {
    throw new AppDefinitionInvalidError({
      folder: "effects",
      reason: `no recipe holds the effect ${effect}`,
    })
  }
  return found
}

export function effectKeyOf(effect: string): string {
  return effect.replace(/-([a-z0-9])/g, (_, letter: string) =>
    letter.toUpperCase()
  )
}

export type {
  EffectRecipe,
  ResolutionValue,
} from "#effects/effect-recipe.contract"
