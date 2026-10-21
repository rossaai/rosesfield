import { AppDefinitionInvalidError } from "#app-definition-invalid.error"
import {
  type EffectRecipe,
  type EffectRun,
  effectLedger,
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
import runs from "./runs.json"

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

type Preview = NonNullable<EffectRecipe["preview"]>

export function readLedger(source: unknown): EffectRun[] {
  const parsed = effectLedger.safeParse(source)
  if (!parsed.success) {
    throw new AppDefinitionInvalidError({
      folder: "effects",
      reason: `the run ledger runs.json is invalid: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")} ${issue.message}`)
        .join(", ")}`,
    })
  }
  return parsed.data
}

function ledgerFailure(
  effect: string,
  preview: Preview,
  ledger: readonly EffectRun[]
): string | null {
  const run = ledger.find((row) => row.runId === preview.runId)
  if (run === undefined) {
    return `the run ${preview.runId} is not a row of the run ledger`
  }
  const sameInput =
    run.effect === effect &&
    run.workflowHash === preview.workflowHash &&
    run.seed === preview.seed &&
    run.resolution === preview.resolution &&
    run.aspectRatio === preview.aspectRatio
  if (!sameInput) {
    return `the run ledger records the run ${preview.runId} with another recipe or input`
  }
  if (run.verdict !== "kept") {
    return `the run ledger records the run ${preview.runId} as refused`
  }
  return null
}

export function readRecipes(
  sources: Readonly<Record<string, unknown>>,
  ledger: readonly EffectRun[]
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
    const unrecorded =
      preview === null ? null : ledgerFailure(file, preview, ledger)
    if (unrecorded !== null) {
      throw new AppDefinitionInvalidError({
        folder: "effects",
        reason: `the recipe ${file}.json passed on a run the ledger does not keep: ${unrecorded}`,
      })
    }
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

export const effectRuns: readonly EffectRun[] = readLedger(runs)

export const effectRecipes: readonly EffectRecipe[] = readRecipes(
  files,
  effectRuns
)

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
  EffectRun,
  ResolutionValue,
} from "#effects/effect-recipe.contract"
