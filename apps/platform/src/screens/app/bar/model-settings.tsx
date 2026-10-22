import { isHostedModelId, lineKeyOf } from "@rosesfield/catalog/comfy"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import {
  ModelPicker,
  type ModelPickerRow,
  type ModelPickerSection,
} from "@rosesfield/ui/components/model-picker"
import { ModelChip } from "@rosesfield/ui/components/model-trigger"
import type { ReactElement, ReactNode } from "react"
import { isAssetInput } from "@/catalog/app-facts"
import { t, tCatalog } from "@/copy/t"
import { LabMark } from "@/pieces/lab-mark"
import { aspectField, countField } from "@/screens/app/app-form"
import { chipChoiceText } from "@/screens/app/bar/setting-chip"
import { textOf } from "@/screens/app/fields/field-props"
import { InputField } from "@/screens/app/fields/input-field"
import { AspectField, CountField } from "@/screens/app/fields/output-fields"
import {
  modelLineOf,
  openWeightsBadge,
  weightsLinkOf,
} from "@/screens/app/hosted/catalog-picker"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import type { AppScreenState } from "@/screens/app/use-app-screen"

export const modelInputName = "model"

function isTrayInput(input: InputDefinition): boolean {
  return (
    input.type === "prompt" || input.type === "character" || isAssetInput(input)
  )
}

export function settingsInputs(
  app: AppListing,
  chips: readonly string[]
): InputDefinition[] {
  return app.inputs.filter(
    (input) =>
      !isTrayInput(input) &&
      input.type !== "seed" &&
      !chips.includes(input.name)
  )
}

type ModelSettingsProps = {
  app: AppListing
  state: AppScreenState
  chips: readonly string[]
}

export function ModelSettings({
  app,
  state,
  chips,
}: ModelSettingsProps): ReactElement {
  const { form } = state
  return (
    <div className="flex flex-col gap-s4">
      {settingsInputs(app, chips).map((input) => (
        <InputField
          key={input.name}
          app={app}
          input={input}
          value={form.values.inputs[input.name]}
          problem={form.problems.get(input.name)}
          onChange={(value) => form.setInput(input.name, value)}
          register={(focus) => form.register(input.name, focus)}
        />
      ))}
      {chips.includes(aspectField) ? null : (
        <AspectField
          app={app}
          value={form.values.aspectRatio}
          onChange={(aspectRatio) => form.setForm({ aspectRatio })}
        />
      )}
      {chips.includes(countField) ? null : (
        <CountField
          app={app}
          value={form.values.count}
          onChange={(count) => form.setForm({ count })}
        />
      )}
      <AdvancedFields app={app} form={form} lastSeed={state.lastSeed} />
    </div>
  )
}

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

export function modelChipText(
  model: ChoiceInput | null,
  value: string
): string {
  if (model === null) {
    return t("bar.model")
  }
  return chipChoiceText(model, value || model.default) || t("bar.model")
}

const huggingFace = "https://huggingface.co/"

export function choiceMakerOf(value: string, name: string): string {
  const link = weightsLinkOf(value)
  const lab = link?.slice(huggingFace.length).split("/")[0]
  return lab === undefined || lab === "" ? name : lab
}

export function factsIdOf(value: string): string {
  return isHostedModelId(value) ? value : `graph/${value}`
}

function choiceRow(option: ChoiceInput["options"][number]): ModelPickerRow {
  const name = tCatalog(option.labelKey)
  const maker = choiceMakerOf(option.value, name)
  const href = weightsLinkOf(option.value)
  return {
    id: option.value,
    name,
    maker,
    line: modelLineOf(lineKeyOf(factsIdOf(option.value)), maker),
    tags: [],
    mark: <LabMark maker={maker} />,
    badges: href === null ? [] : [openWeightsBadge(href)],
  }
}

export function choiceSections(
  model: ChoiceInput | null
): ModelPickerSection[] {
  if (model === null) {
    return []
  }
  const rows = model.options.map(choiceRow)
  const featured = rows.filter((row) => row.id === model.default)
  return [
    { id: "featured", label: t("model.picker.featured"), rows: featured },
    { id: "all", label: t("model.picker.all"), rows },
  ].filter((section) => section.rows.length > 0)
}

type ChoiceModelPickerProps = {
  model: ChoiceInput | null
  value: string
  onChoose: (value: string) => void
  settings: ReactNode
}

export function ChoiceModelPicker({
  model,
  value,
  onChoose,
  settings,
}: ChoiceModelPickerProps): ReactElement {
  const chosen = model === null ? null : value || model.default
  const name = modelChipText(model, value)
  const maker = chosen === null ? null : choiceMakerOf(chosen, name)
  return (
    <ModelPicker
      trigger={
        <ModelChip
          name={name}
          aria-label={`${t("model.picker.title")} ${name}`}
          {...(maker === null ? {} : { mark: <LabMark maker={maker} /> })}
        />
      }
      title={t("model.picker.title")}
      searchLabel={t("model.picker.search")}
      searchPlaceholder={t("model.picker.searchPlaceholder")}
      emptyLabel={t("model.picker.empty")}
      sections={choiceSections(model)}
      chosen={chosen}
      onChoose={onChoose}
      settings={settings}
      side="top"
    />
  )
}

export function BarModelChip(props: ModelSettingsProps): ReactElement {
  const input = props.app.inputs.find((one) => one.name === modelInputName)
  const model = input?.type === "choice" ? input : null
  return (
    <ChoiceModelPicker
      model={model}
      value={textOf(props.state.form.values.inputs[modelInputName])}
      onChoose={(next) => props.state.form.setInput(modelInputName, next)}
      settings={
        <ModelSettings {...props} chips={[...props.chips, modelInputName]} />
      }
    />
  )
}
