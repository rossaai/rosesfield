import type { ModelField } from "@rosesfield/catalog/comfy"
import {
  type AppListing,
  type InputDefinition,
  inputRulesOf,
} from "@rosesfield/contract"
import type { FieldValue } from "@/screens/app/app-form"
import { settingsInputs } from "@/screens/app/bar/model-settings"
import { listOf } from "@/screens/app/fields/field-props"
import { modelInputName } from "@/screens/app/hosted/hosted-form"
import type { EditTool } from "@/studio/edit/edit-tools"
import { nearestRatio, type PhotoSize } from "@/studio/edit/photo-check"

type Inputs = Readonly<Record<string, FieldValue>>

export type SlotMove =
  | { kind: "adopt"; photo: string }
  | { kind: "place"; ids: string[] }
  | { kind: "none" }

const formatInput = "aspect"

export function appliedApp(app: AppListing, inputs: Inputs): AppListing {
  const applied = new Set(
    inputRulesOf(app, inputs).map((rule) => rule.input.name)
  )
  return {
    ...app,
    inputs: app.inputs.filter((input) => applied.has(input.name)),
  }
}

export type ImageSlot = {
  name: string
  max: number
}

export function imageSlotsOf(
  app: AppListing,
  fields: readonly ModelField[] | null,
  inputs: Inputs
): ImageSlot[] {
  if (fields !== null) {
    return fields.flatMap((field) =>
      field.kind === "media" && field.media === "image"
        ? [{ name: field.name, max: field.max }]
        : []
    )
  }
  return appliedApp(app, inputs).inputs.flatMap((input) =>
    input.type === "image" ? [{ name: input.name, max: input.max }] : []
  )
}

export function extraSlotOf(
  slots: readonly ImageSlot[],
  inputs: Inputs
): string | null {
  const [, ...others] = slots
  const open = others.find(
    (slot) => listOf(inputs[slot.name]).length < slot.max
  )
  return open?.name ?? null
}

export function slotMoveOf(
  photo: string | null,
  held: FieldValue
): SlotMove {
  const [first] = listOf(held)
  if (first !== undefined && first !== photo) {
    return { kind: "adopt", photo: first }
  }
  if (first === undefined && photo !== null) {
    return { kind: "place", ids: [photo] }
  }
  return { kind: "none" }
}

function aspectOptionsOf(app: AppListing): readonly string[] {
  return app.output.kind === "image" || app.output.kind === "video"
    ? app.output.aspectRatios.options
    : []
}

export function ratioFor(
  tool: EditTool,
  app: AppListing,
  inputs: Inputs,
  size: PhotoSize | null
): string | null {
  const options = aspectOptionsOf(app)
  if (tool.ratio === "photo") {
    return size === null ? null : nearestRatio(options, size)
  }
  const format = appliedApp(app, inputs).inputs.find(
    (input) => input.name === formatInput && input.type === "choice"
  )
  const value = inputs[formatInput]
  if (format === undefined || typeof value !== "string") {
    return null
  }
  const ratio = value.replace("-", ":")
  return options.includes(ratio) ? ratio : null
}

function isChipInput(input: InputDefinition): boolean {
  return input.name !== modelInputName
}

export function chipNamesOf(app: AppListing, inputs: Inputs): string[] {
  return settingsInputs(appliedApp(app, inputs), [])
    .filter(isChipInput)
    .map((input) => input.name)
}
