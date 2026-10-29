import type { ModelField } from "@rosesfield/catalog/comfy"
import { type AppListing, fixedCountOf } from "@rosesfield/contract"
import {
  appliedApp,
  aspectField,
  countField,
  type FieldValue,
} from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import {
  type AppSetting,
  appSettingsPlan,
  type SettingsPlan,
} from "@/screens/app/settings-plan"
import type { EditTool } from "@/studio/edit/edit-tools"
import { nearestRatio, type PhotoSize } from "@/studio/edit/photo-check"

type Inputs = Readonly<Record<string, FieldValue>>

export type SlotMove =
  | { kind: "adopt"; photo: string }
  | { kind: "place"; ids: string[] }
  | { kind: "none" }

const formatInput = "aspect"

export type ImageSlot = {
  name: string
  max: number
  presence: "required" | "optional"
}

export function imageSlotsOf(
  app: AppListing,
  fields: readonly ModelField[] | null,
  inputs: Inputs
): ImageSlot[] {
  if (fields !== null) {
    return fields.flatMap((field) =>
      field.kind === "media" && field.media === "image"
        ? [
            {
              name: field.name,
              max: field.max,
              presence: field.required ? "required" : "optional",
            } satisfies ImageSlot,
          ]
        : []
    )
  }
  return appliedApp(app, inputs).inputs.flatMap((input) =>
    input.type === "image"
      ? [{ name: input.name, max: input.max, presence: input.presence }]
      : []
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

export function slotMoveOf(photo: string | null, held: FieldValue): SlotMove {
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
    ? (app.output.aspectRatios?.options ?? [])
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

const resolutionInput = "resolution"

const resolutionCaption = "model.field.resolution"

export type FoldedPlan = {
  main: string[]
  advanced: AppSetting[]
}

export type ToolChips = FoldedPlan & {
  app: AppListing
  mode: string | null
  hasCount: boolean
}

function chipNameOf(setting: AppSetting): string {
  switch (setting.kind) {
    case "aspect":
      return aspectField
    case "count":
      return countField
    case "input":
      return setting.input.name
  }
}

export function foldSettings(
  plan: SettingsPlan<AppSetting>,
  folded: readonly string[]
): SettingsPlan<AppSetting> {
  const isFolded = (setting: AppSetting): boolean =>
    folded.includes(chipNameOf(setting))
  return {
    main: plan.main.filter((one) => !isFolded(one)),
    advanced: [...plan.main.filter(isFolded), ...plan.advanced],
  }
}

export function foldedPlanOf(
  app: AppListing,
  except: readonly string[],
  folded: readonly string[]
): FoldedPlan {
  const plan = foldSettings(appSettingsPlan(app, except), folded)
  return { main: plan.main.map(chipNameOf), advanced: plan.advanced }
}

function chipAppOf(app: AppListing, inputs: Inputs): AppListing {
  const applied = appliedApp(app, inputs)
  return {
    ...applied,
    inputs: applied.inputs.map((input) =>
      input.name === resolutionInput && input.type === "choice"
        ? { ...input, labelKey: resolutionCaption }
        : input
    ),
  }
}

export function toolChipsOf(
  tool: EditTool,
  app: AppListing,
  inputs: Inputs
): ToolChips {
  const chipApp = chipAppOf(app, inputs)
  const mode =
    tool.mode !== null && chipApp.inputs.some((one) => one.name === tool.mode)
      ? tool.mode
      : null
  const except = [aspectField, countField]
  return {
    ...foldedPlanOf(
      chipApp,
      mode === null ? except : [...except, mode],
      tool.folded
    ),
    app: chipApp,
    mode,
    hasCount:
      fixedCountOf(app, inputs) === null && chipApp.output.count.max > 1,
  }
}

export function hasModelChoice(hosted: HostedState): boolean {
  return hosted.error !== null || hosted.models.length > 1
}
