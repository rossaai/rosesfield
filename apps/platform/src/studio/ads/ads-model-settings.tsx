import type { AppListing, InputDefinition } from "@rosesfield/contract"
import type { ReactElement } from "react"
import { aspectField, countField } from "@/screens/app/app-form"
import {
  ModelInputChips,
  settingsInputs,
} from "@/screens/app/bar/model-settings"
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
      {chips.includes(modelInput) ? null : (
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

export function AdsModelChip(props: AdsSettingsProps): ReactElement {
  return (
    <>
      <AdsCatalogPicker
        app={props.app}
        hosted={props.state.hosted}
        place="chip"
      />
      <ModelInputChips
        app={props.app}
        form={props.state.form}
        lastSeed={props.state.lastSeed}
        chips={[...props.chips, modelInput]}
      />
    </>
  )
}
