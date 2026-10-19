import {
  type AppListing,
  type InputDefinition,
  whenHolds,
} from "@rosesfield/contract"
import type { FormValues } from "@/screens/app/app-form"

export type RecastMode = "character" | "object"

export const modeInput = "mode"
export const sourceInput = "source"

const modes: readonly RecastMode[] = ["character", "object"]

function isRecastMode(value: unknown): value is RecastMode {
  return modes.some((mode) => mode === value)
}

export function modeOf(values: FormValues): RecastMode {
  const value = values.inputs[modeInput]
  return isRecastMode(value) ? value : "character"
}

function appliesIn(input: InputDefinition, mode: RecastMode): boolean {
  return input.type === "seed" || whenHolds(input.when, { [modeInput]: mode })
}

function optional(input: InputDefinition): InputDefinition {
  switch (input.type) {
    case "prompt":
    case "image":
    case "video":
    case "audio":
    case "character":
      return { ...input, presence: "optional" }
    default:
      return input
  }
}

export function formAppFor(app: AppListing, mode: RecastMode): AppListing {
  return {
    ...app,
    inputs: app.inputs.map((input) =>
      appliesIn(input, mode) ? input : optional(input)
    ),
  }
}

export function bodyAppFor(app: AppListing, mode: RecastMode): AppListing {
  return {
    ...app,
    inputs: app.inputs.filter((input) => appliesIn(input, mode)),
  }
}

export function shownInputsOf(
  app: AppListing,
  mode: RecastMode
): InputDefinition[] {
  return app.inputs.filter(
    (input) => input.type !== "seed" && appliesIn(input, mode)
  )
}
