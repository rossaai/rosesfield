import { factsOf, isHostedModelId, labOfModel } from "@rosesfield/catalog/comfy"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import {
  ModelPicker,
  type ModelPickerRow,
  type ModelPrice,
} from "@rosesfield/ui/components/model-picker"
import { ModelChip } from "@rosesfield/ui/components/model-trigger"
import { useQuery } from "@tanstack/react-query"
import { type ReactElement, type ReactNode, useMemo, useState } from "react"
import { settingsQuery } from "@/api/queries"
import { isAssetInput } from "@/catalog/app-facts"
import { t, tCatalog } from "@/copy/t"
import { LabMark } from "@/pieces/lab-mark"
import {
  appliedApp,
  aspectField,
  bodyOf,
  countField,
} from "@/screens/app/app-form"
import {
  AdvancedChip,
  chipChoiceText,
  SettingChip,
} from "@/screens/app/bar/setting-chip"
import { textOf } from "@/screens/app/fields/field-props"
import {
  AppSettingRows,
  AppSettingsSection,
  settingId,
} from "@/screens/app/fields/setting-rows"
import {
  useRecentModels,
  useSamePrices,
} from "@/screens/app/hosted/catalog-picker"
import type { PriceAsk } from "@/screens/app/hosted/model-catalog-query"
import {
  modelRowsOf,
  pickerWords,
  type RowModel,
  todayOf,
} from "@/screens/app/hosted/model-rows"
import { weightsLinkOf } from "@/screens/app/hosted/row-badges"
import { useAskPrices } from "@/screens/app/hosted/use-row-prices"
import {
  type AppSetting,
  appSettingsPlan,
  isSettingInput,
} from "@/screens/app/settings-plan"
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
  const applied = appliedApp(app, form.values.inputs)
  return (
    <div className="flex flex-col gap-s4">
      <AppSettingsSection
        app={applied}
        form={form}
        lastSeed={state.lastSeed}
        plan={appSettingsPlan(applied, chips)}
      />
    </div>
  )
}

function shownAppOf(
  app: AppListing,
  shown: (input: InputDefinition) => InputDefinition | null
): AppListing {
  return {
    ...app,
    inputs: app.inputs.flatMap((input) => {
      if (!isSettingInput(input)) {
        return [input]
      }
      const one = shown(input)
      return one === null ? [] : [one]
    }),
  }
}

function settingChipName(setting: AppSetting): string {
  switch (setting.kind) {
    case "aspect":
      return aspectField
    case "count":
      return countField
    case "input":
      return setting.input.name
  }
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
  const chipApp = shownAppOf(appliedApp(app, form.values.inputs), shown)
  const plan = appSettingsPlan(chipApp, chips)
  return (
    <>
      {plan.main.map((setting) => (
        <SettingChip
          key={settingId(setting)}
          app={chipApp}
          form={form}
          name={settingChipName(setting)}
        />
      ))}
      {plan.advanced.length === 0 ? null : (
        <AdvancedChip>
          <AppSettingRows
            app={chipApp}
            form={form}
            lastSeed={lastSeed}
            settings={plan.advanced}
          />
        </AdvancedChip>
      )}
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

type ChoiceOption = ChoiceInput["options"][number]

export function choiceRowModel(option: ChoiceOption): RowModel {
  const facts = factsOf(factsIdOf(option.value))
  const [task] = Object.keys(facts.scores)
  const name = tCatalog(option.labelKey)
  return {
    id: option.value,
    name,
    lab: choiceLabOf(option.value, name),
    keywords: [],
    task: task ?? null,
    facts,
    tags: isHostedModelId(option.value) ? [] : [{ kind: "open-weights" }],
  }
}

export function choiceRowsOf(
  model: ChoiceInput | null,
  prices: ReadonlyMap<string, ModelPrice> = new Map(),
  today: string = todayOf()
): ModelPickerRow[] {
  return model === null
    ? []
    : modelRowsOf(model.options.map(choiceRowModel), { today, prices })
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
  place?: "chip" | "row"
}

export function ChoiceModelPicker({
  model,
  value,
  onChoose,
  pricing,
  place = "chip",
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
  const recent = useRecentModels(pricing?.appId ?? null)
  const samePrices = useSamePrices(prices)
  const rows = useMemo(
    () => choiceRowsOf(model, samePrices),
    [model, samePrices]
  )
  const chosen = model === null ? null : value || model.default
  const name = modelChipText(model, value)
  const maker = chosen === null ? null : choiceLabOf(chosen, name)
  return (
    <ModelPicker
      trigger={
        <ModelChip
          name={name}
          aria-label={`${t("model.picker.title")} ${name}`}
          width={place === "row" ? "full" : "fit"}
          {...(maker === null ? {} : { mark: <LabMark maker={maker} /> })}
        />
      }
      words={pickerWords()}
      rows={rows}
      chosen={chosen}
      onChoose={onChoose}
      open={isOpen}
      onOpenChange={setOpen}
      isPricing={isPricing}
      recent={recent}
      side="top"
    />
  )
}

export function modelInputOf(app: AppListing): ChoiceInput | null {
  const input = app.inputs.find((one) => one.name === modelInputName)
  return input?.type === "choice" ? input : null
}

export function AppModelPicker({
  app,
  form,
  place,
}: {
  app: AppListing
  form: AppForm
  place: "chip" | "row"
}): ReactElement | null {
  const model = modelInputOf(app)
  const { values } = form
  return model === null ? null : (
    <ChoiceModelPicker
      model={model}
      place={place}
      pricing={{
        appId: app.id,
        askOf: (id) =>
          bodyOf(app, {
            ...values,
            inputs: { ...values.inputs, [modelInputName]: id },
          }),
      }}
      value={textOf(values.inputs[modelInputName])}
      onChoose={(next) => form.setInput(modelInputName, next)}
    />
  )
}

export function BarModelChip(
  props: ModelSettingsProps & { formats?: ReactNode }
): ReactElement {
  return (
    <>
      <AppModelPicker app={props.app} form={props.state.form} place="chip" />
      {props.formats}
      <ModelInputChips
        app={props.app}
        form={props.state.form}
        lastSeed={props.state.lastSeed}
        chips={props.chips}
      />
    </>
  )
}
