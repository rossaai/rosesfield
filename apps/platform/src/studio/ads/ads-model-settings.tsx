import type { AppListing, InputDefinition } from "@rosesfield/contract"
import {
  RadioGroup,
  RadioGroupItem,
} from "@rosesfield/ui/components/radio-group"
import type { ReactElement } from "react"
import { t, tCatalog } from "@/copy/t"
import { aspectField, countField } from "@/screens/app/app-form"
import {
  ChoiceModelPicker,
  settingsInputs,
} from "@/screens/app/bar/model-settings"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { textOf } from "@/screens/app/fields/field-props"
import { inputCaption } from "@/screens/app/fields/input-copy"
import { InputField } from "@/screens/app/fields/input-field"
import { AspectField, CountField } from "@/screens/app/fields/output-fields"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import type { AppForm } from "@/screens/app/use-app-form"
import { AdsCatalogPicker } from "@/studio/ads/ads-model-picker"
import { modelInput } from "@/studio/ads/ads-rules"
import type { AdsScreenState } from "@/studio/ads/use-ads-screen"

const styleInput = "style"

type AdsSettingsProps = {
  app: AppListing
  state: AdsScreenState
  chips: readonly string[]
}

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

function modelInputOf(app: AppListing): ChoiceInput | null {
  const input = app.inputs.find((one) => one.name === modelInput)
  return input?.type === "choice" ? input : null
}

function chosenModel(input: ChoiceInput, form: AppForm): string {
  return textOf(form.values.inputs[input.name]) || input.default
}

function ModelField({
  input,
  form,
}: {
  input: ChoiceInput
  form: AppForm
}): ReactElement {
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={false}
      note={null}
      problem={undefined}
    >
      <RadioGroup
        value={chosenModel(input, form)}
        onValueChange={(next) => {
          if (typeof next === "string") {
            form.setInput(input.name, next)
          }
        }}
        aria-label={inputCaption(input)}
      >
        {input.options.map((option) => (
          // biome-ignore lint/a11y/noLabelWithoutControl: the radio inside is the control
          <label key={option.value} className="flex items-start gap-s3">
            <RadioGroupItem value={option.value} className="mt-s1" />
            <span className="flex min-w-0 flex-col">
              <span className="text-body">{tCatalog(option.labelKey)}</span>
              <span className="text-caption text-ink-muted">
                {tCatalog(`${option.labelKey}.line`)}
              </span>
              <span className="text-caption text-ink-muted">
                {t("field.model.open")}
              </span>
            </span>
          </label>
        ))}
      </RadioGroup>
    </FieldFrame>
  )
}

function SheetModel({
  app,
  state,
  input,
}: {
  app: AppListing
  state: AdsScreenState
  input: ChoiceInput | null
}): ReactElement | null {
  if (state.hosted.isTaskApp) {
    return <AdsCatalogPicker app={app} hosted={state.hosted} place="row" />
  }
  return input === null ? null : <ModelField input={input} form={state.form} />
}

function SettingField({
  app,
  form,
  input,
}: {
  app: AppListing
  form: AppForm
  input: InputDefinition
}): ReactElement {
  return (
    <InputField
      app={app}
      input={input}
      value={form.values.inputs[input.name]}
      problem={form.problems.get(input.name)}
      onChange={(value) => form.setInput(input.name, value)}
      register={(focus) => form.register(input.name, focus)}
    />
  )
}

export function AdsModelSettings({
  app,
  state,
  chips,
}: AdsSettingsProps): ReactElement {
  const { form } = state
  const model = modelInputOf(app)
  const others = settingsInputs(app, chips).filter(
    (input) => input.name !== modelInput
  )
  const leading = others.filter((input) => input.name !== styleInput)
  const style = others.filter((input) => input.name === styleInput)
  return (
    <div className="flex flex-col gap-s4">
      {leading.map((input) => (
        <SettingField key={input.name} app={app} form={form} input={input} />
      ))}
      {chips.includes(modelInput) ? null : (
        <SheetModel app={app} state={state} input={model} />
      )}
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
      {style.map((input) => (
        <SettingField key={input.name} app={app} form={form} input={input} />
      ))}
      <AdvancedFields app={app} form={form} lastSeed={state.lastSeed} />
    </div>
  )
}

export function AdsModelChip(props: AdsSettingsProps): ReactElement {
  const model = modelInputOf(props.app)
  const settings = (
    <AdsModelSettings {...props} chips={[...props.chips, modelInput]} />
  )
  if (props.state.hosted.isTaskApp) {
    return (
      <AdsCatalogPicker
        app={props.app}
        hosted={props.state.hosted}
        place="chip"
        settings={settings}
      />
    )
  }
  return (
    <ChoiceModelPicker
      model={model}
      value={model === null ? "" : chosenModel(model, props.state.form)}
      onChoose={(next) => props.state.form.setInput(modelInput, next)}
      settings={settings}
    />
  )
}
