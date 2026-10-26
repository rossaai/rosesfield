import type { AppListing, InputDefinition } from "@rosesfield/contract"
import type { ReactElement, ReactNode } from "react"
import { appliedApp } from "@/screens/app/app-form"
import {
  AppModelPicker,
  modelInputName,
} from "@/screens/app/bar/model-settings"
import { InputField } from "@/screens/app/fields/input-field"
import {
  AdvancedSection,
  AppSettingRows,
  AppSettingsSection,
  randomSeed,
} from "@/screens/app/fields/setting-rows"
import { appSettingsPlan, isSettingInput } from "@/screens/app/settings-plan"
import type { AppForm } from "@/screens/app/use-app-form"

type InputsPanelProps = {
  app: AppListing
  form: AppForm
  lastSeed: number | null
}

export function AdvancedFields({
  app,
  form,
  lastSeed,
}: InputsPanelProps): ReactElement | null {
  const { advanced } = appSettingsPlan(appliedApp(app, form.values.inputs))
  return advanced.length === 0 ? null : (
    <AdvancedSection>
      <AppSettingRows
        app={app}
        form={form}
        lastSeed={lastSeed}
        settings={advanced}
      />
    </AdvancedSection>
  )
}

export function trayInputsOf(app: AppListing): InputDefinition[] {
  const inputs = app.inputs.filter(
    (input) => !isSettingInput(input) && input.name !== modelInputName
  )
  return [
    ...inputs.filter((input) => input.type !== "prompt"),
    ...inputs.filter((input) => input.type === "prompt"),
  ]
}

export function InputsPanel({
  model,
  ...props
}: InputsPanelProps & { model?: ReactNode }): ReactElement {
  const { form } = props
  const app = appliedApp(props.app, form.values.inputs)
  return (
    <div className="flex flex-col gap-s4">
      {trayInputsOf(app).map((input) => (
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
      {model ?? <AppModelPicker app={app} form={form} place="row" />}
      <AppSettingsSection
        app={app}
        form={form}
        lastSeed={props.lastSeed}
        plan={appSettingsPlan(app)}
      />
    </div>
  )
}

export { randomSeed }
