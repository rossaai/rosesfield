import type { AppListing, InputDefinition } from "@rosesfield/contract"
import type { ReactElement, ReactNode } from "react"
import { appliedApp, aspectField, countField } from "@/screens/app/app-form"
import { settingsInputs } from "@/screens/app/bar/model-settings"
import { SettingChip } from "@/screens/app/bar/setting-chip"
import { InputField } from "@/screens/app/fields/input-field"
import { AspectField, CountField } from "@/screens/app/fields/output-fields"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import type { AppForm } from "@/screens/app/use-app-form"
import { AdsCatalogPicker } from "@/studio/ads/ads-model-picker"
import { kindInput, modelInput } from "@/studio/ads/ads-rules"
import type { AdsScreenState } from "@/studio/ads/use-ads-screen"
import { FoldedChips } from "@/studio/edit/edit-chips"
import { foldedPlanOf, hasModelChoice } from "@/studio/edit/edit-form"

const styleInput = "style"

const foldedInputs: readonly string[] = [styleInput]

type AdsSettingsProps = {
  app: AppListing
  state: AdsScreenState
  chips: readonly string[]
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
      {chips.includes(modelInput) || !hasModelChoice(state.hosted) ? null : (
        <AdsCatalogPicker app={app} hosted={state.hosted} place="row" />
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
          app={state.countApp}
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

export function AdsModelChip(
  props: AdsSettingsProps & { formats?: ReactNode }
): ReactElement {
  const { app, state } = props
  const shown = appliedApp(app, state.form.values.inputs)
  return (
    <>
      <SettingChip app={app} form={state.form} name={kindInput} />
      {hasModelChoice(state.hosted) ? (
        <AdsCatalogPicker app={app} hosted={state.hosted} place="chip" />
      ) : null}
      {props.formats}
      <FoldedChips
        app={shown}
        form={state.form}
        lastSeed={state.lastSeed}
        plan={foldedPlanOf(
          shown,
          [...props.chips, kindInput, modelInput],
          foldedInputs
        )}
      />
    </>
  )
}
