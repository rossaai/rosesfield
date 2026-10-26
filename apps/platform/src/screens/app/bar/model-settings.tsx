import {
  factsOf,
  isHostedModelId,
  labOfModel,
  type ModelTag,
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
  capabilitiesOf,
  costOf,
  openWeightsTag,
  pickerFilters,
  todayOf,
  useRecentModels,
} from "@/screens/app/hosted/catalog-picker"
import type { PriceAsk } from "@/screens/app/hosted/model-catalog-query"
import {
  mainTaskOf,
  type RankedModel,
  taskBoardsOf,
  topOrderOf,
} from "@/screens/app/hosted/model-sections"
import {
  type BadgeContext,
  badgesOf,
  weightsLinkOf,
} from "@/screens/app/hosted/row-badges"
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

type ChoiceModel = RankedModel & { option: ChoiceOption }

function choiceModelOf(option: ChoiceOption): ChoiceModel {
  const facts = factsOf(factsIdOf(option.value))
  const [task] = Object.keys(facts.scores)
  return { id: option.value, task: task ?? null, facts, option }
}

export function choiceTagsOf(
  value: string,
  hasWeightsBadge: boolean
): ModelPickerTag[] {
  return isHostedModelId(value) || hasWeightsBadge ? [] : [openWeightsTag()]
}

function choiceRow(
  model: ChoiceModel,
  prices: ReadonlyMap<string, ModelPrice>,
  context: BadgeContext
): ModelPickerRow {
  const { option, facts } = model
  const price = prices.get(option.value)
  const cost = costOf(price)
  const name = tCatalog(option.labelKey)
  const maker = choiceLabOf(option.value, name)
  const href = weightsLinkOf(option.value)
  const weights: ModelTag[] = href === null ? [] : [{ kind: "open-weights" }]
  return {
    id: option.value,
    name,
    maker,
    tags: [
      ...choiceTagsOf(option.value, href !== null),
      ...capabilitiesOf([], facts),
    ],
    mark: <LabMark maker={maker} />,
    badges: badgesOf(option.value, weights, facts, context),
    ...(price === undefined ? {} : { price }),
    ...(cost === undefined ? {} : { cost }),
    ...(facts?.release === undefined || facts.release === null
      ? {}
      : { released: facts.release }),
    isOpen: !isHostedModelId(option.value),
  }
}

export function choiceSections(
  model: ChoiceInput | null,
  prices: ReadonlyMap<string, ModelPrice> = new Map(),
  today: string = todayOf()
): ModelPickerSection[] {
  if (model === null) {
    return []
  }
  const models = model.options.map(choiceModelOf)
  const task = mainTaskOf(models)
  const context = { task, today, taskBoards: taskBoardsOf(models, task) }
  const rows = topOrderOf(models, task).map((one) =>
    choiceRow(one, prices, context)
  )
  return rows.length === 0
    ? []
    : [{ id: "all", label: t("model.picker.all"), rows }]
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
