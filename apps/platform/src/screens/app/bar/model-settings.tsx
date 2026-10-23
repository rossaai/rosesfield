import {
  factsOf,
  inputRoleOf,
  isHostedModelId,
  labOfModel,
  modelFactsData,
} from "@rosesfield/catalog/comfy"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import {
  ModelPicker,
  type ModelPickerRow,
  type ModelPickerSection,
  type ModelPickerTag,
} from "@rosesfield/ui/components/model-picker"
import type { ModelPrice } from "@rosesfield/ui/components/model-row"
import { ModelChip } from "@rosesfield/ui/components/model-trigger"
import { useQuery } from "@tanstack/react-query"
import { type ReactElement, type ReactNode, useState } from "react"
import { settingsQuery } from "@/api/queries"
import { isAssetInput } from "@/catalog/app-facts"
import { bySettingOrder, settingOf } from "@/catalog/setting-registry"
import { t, tCatalog } from "@/copy/t"
import { LabMark } from "@/pieces/lab-mark"
import { aspectField, bodyOf, countField } from "@/screens/app/app-form"
import {
  chipChoiceText,
  inputIconOf,
  PopoverChip,
  SettingChip,
} from "@/screens/app/bar/setting-chip"
import { textOf } from "@/screens/app/fields/field-props"
import { inputCaption } from "@/screens/app/fields/input-copy"
import { InputField } from "@/screens/app/fields/input-field"
import { AspectField, CountField } from "@/screens/app/fields/output-fields"
import {
  openWeightsBadge,
  openWeightsTag,
  pickerFilters,
  rankTagOf,
  weightsLinkOf,
} from "@/screens/app/hosted/catalog-picker"
import type { PriceAsk } from "@/screens/app/hosted/model-catalog-query"
import { useAskPrices } from "@/screens/app/hosted/use-row-prices"
import { AdvancedFields, SeedChip } from "@/screens/app/inputs-panel"
import type { AppForm } from "@/screens/app/use-app-form"
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

function isChipInput(input: InputDefinition): boolean {
  return (
    input.type === "choice" ||
    input.type === "number" ||
    input.type === "toggle"
  )
}

function shownValueOf(value: unknown): string {
  if (typeof value === "string" && value.trim() !== "") {
    return value
  }
  return typeof value === "number" ? String(value) : t("field.choice.notSet")
}

export function ModelInputChips({
  app,
  form,
  lastSeed,
  chips,
  shown = (input) => input,
}: {
  app: AppListing
  form: AppForm
  lastSeed: number | null
  chips: readonly string[]
  shown?: (input: InputDefinition) => InputDefinition | null
}): ReactElement {
  const inputs = settingsInputs(app, chips)
    .flatMap((input) => {
      const one = input.name === modelInputName ? null : shown(input)
      return one === null ? [] : [one]
    })
    .sort(
      bySettingOrder((input) =>
        settingOf(input.name, inputRoleOf(input.name, app.output.kind))
      )
    )
  const chipApp: AppListing = {
    ...app,
    inputs: app.inputs.map(
      (input) => inputs.find((one) => one.name === input.name) ?? input
    ),
  }
  return (
    <>
      {chips.includes(aspectField) ? null : (
        <SettingChip app={app} form={form} name={aspectField} />
      )}
      {chips.includes(countField) ? null : (
        <SettingChip app={app} form={form} name={countField} />
      )}
      {inputs.map((input) =>
        isChipInput(input) ? (
          <SettingChip
            key={input.name}
            app={chipApp}
            form={form}
            name={input.name}
          />
        ) : (
          <PopoverChip
            key={input.name}
            label={inputCaption(input)}
            icon={inputIconOf(app, input)}
            shown={shownValueOf(form.values.inputs[input.name])}
          >
            <InputField
              app={app}
              input={input}
              value={form.values.inputs[input.name]}
              problem={form.problems.get(input.name)}
              onChange={(value) => form.setInput(input.name, value)}
              register={(focus) => form.register(input.name, focus)}
            />
          </PopoverChip>
        )
      )}
      <SeedChip app={app} form={form} lastSeed={lastSeed} />
    </>
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

export function choiceLabOf(value: string, name: string): string {
  return labOfModel(factsIdOf(value)) ?? choiceMakerOf(value, name)
}

export function choiceTagsOf(
  value: string,
  hasWeightsBadge: boolean
): ModelPickerTag[] {
  const id = factsIdOf(value)
  const facts = modelFactsData.models[id]
  const rankTask = facts === undefined ? undefined : Object.keys(facts.ranks)[0]
  const rank = rankTask === undefined ? null : rankTagOf(factsOf(id, rankTask))
  return [
    ...(isHostedModelId(value) || hasWeightsBadge ? [] : [openWeightsTag()]),
    ...(rank === null ? [] : [rank]),
  ]
}

function choiceRow(
  option: ChoiceInput["options"][number],
  prices: ReadonlyMap<string, ModelPrice>
): ModelPickerRow {
  const price = prices.get(option.value)
  const name = tCatalog(option.labelKey)
  const maker = choiceLabOf(option.value, name)
  const href = weightsLinkOf(option.value)
  return {
    id: option.value,
    name,
    maker,
    tags: choiceTagsOf(option.value, href !== null),
    mark: <LabMark maker={maker} />,
    badges: href === null ? [] : [openWeightsBadge(href)],
    ...(price === undefined ? {} : { price }),
  }
}

export function choiceSections(
  model: ChoiceInput | null,
  prices: ReadonlyMap<string, ModelPrice> = new Map()
): ModelPickerSection[] {
  if (model === null) {
    return []
  }
  const rows = model.options.map((option) => choiceRow(option, prices))
  const featured = rows.filter((row) => row.id === model.default)
  return [
    { id: "featured", label: t("model.picker.featured"), rows: featured },
    { id: "all", label: t("model.picker.all"), rows },
  ].filter((section) => section.rows.length > 0)
}

type ChoicePricing = {
  appId: string
  askOf: (value: string) => PriceAsk
}

type ChoiceModelPickerProps = {
  model: ChoiceInput | null
  value: string
  onChoose: (value: string) => void
  pricing?: ChoicePricing
}

export function ChoiceModelPicker({
  model,
  value,
  onChoose,
  pricing,
}: ChoiceModelPickerProps): ReactElement {
  const [isOpen, setOpen] = useState(false)
  const keyState = useQuery(settingsQuery).data?.engine.key ?? "unknown"
  const { prices, isPricing } = useAskPrices({
    appId: pricing?.appId ?? "",
    keyState,
    ids: model?.options.map((option) => option.value) ?? [],
    askOf: (id) => pricing?.askOf(id) ?? { inputs: {} },
    isOpen,
  })
  const chosen = model === null ? null : value || model.default
  const name = modelChipText(model, value)
  const maker = chosen === null ? null : choiceLabOf(chosen, name)
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
      sections={choiceSections(model, prices)}
      chosen={chosen}
      onChoose={onChoose}
      open={isOpen}
      onOpenChange={setOpen}
      isPricing={isPricing}
      filters={pickerFilters()}
      side="top"
    />
  )
}

export function BarModelChip(
  props: ModelSettingsProps & { formats?: ReactNode }
): ReactElement {
  const input = props.app.inputs.find((one) => one.name === modelInputName)
  const model = input?.type === "choice" ? input : null
  const { app } = props
  const { values } = props.state.form
  return (
    <>
      <ChoiceModelPicker
        model={model}
        pricing={{
          appId: app.id,
          askOf: (id) =>
            bodyOf(app, {
              ...values,
              inputs: { ...values.inputs, [modelInputName]: id },
            }),
        }}
        value={textOf(props.state.form.values.inputs[modelInputName])}
        onChoose={(next) => props.state.form.setInput(modelInputName, next)}
      />
      {props.formats}
      <ModelInputChips
        app={props.app}
        form={props.state.form}
        lastSeed={props.state.lastSeed}
        chips={[...props.chips, modelInputName]}
      />
    </>
  )
}
