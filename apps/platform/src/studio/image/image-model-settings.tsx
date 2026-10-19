import type { AppListing } from "@rosesfield/contract"
import { type ReactElement, useEffect } from "react"
import { aspectField, countField } from "@/screens/app/app-form"
import {
  modelInputName,
  settingsInputs,
} from "@/screens/app/bar/model-settings"
import { textOf } from "@/screens/app/fields/field-props"
import { InputField } from "@/screens/app/fields/input-field"
import { AspectField, CountField } from "@/screens/app/fields/output-fields"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import type { AppForm } from "@/screens/app/use-app-form"
import type { AppScreenState } from "@/screens/app/use-app-screen"
import { isGraphModel } from "@/studio/image/image-fields"
import { correctionsOf, shownInputOf } from "@/studio/image/image-rules"

type ImageSettingsProps = {
  app: AppListing
  state: AppScreenState
  chips: readonly string[]
}

export const graphChips: readonly string[] = [
  aspectField,
  countField,
  "resolution",
]

export function useGraphRules(app: AppListing, form: AppForm): void {
  const { inputs } = form.values
  const { setInput } = form
  const isGraph = isGraphModel(textOf(inputs[modelInputName]))
  useEffect(() => {
    if (!isGraph) {
      return
    }
    for (const [name, value] of Object.entries(correctionsOf(app, inputs))) {
      setInput(name, value)
    }
  }, [app, inputs, setInput, isGraph])
}

export function ImageModelSettings({
  app,
  state,
  chips,
}: ImageSettingsProps): ReactElement {
  const { form } = state
  return (
    <div className="flex flex-col gap-s4">
      {settingsInputs(app, chips).map((input) => {
        const shown =
          input.name === modelInputName
            ? null
            : shownInputOf(app, form.values.inputs, input)
        return shown === null ? null : (
          <InputField
            key={input.name}
            app={app}
            input={shown}
            value={form.values.inputs[input.name]}
            problem={form.problems.get(input.name)}
            onChange={(value) => form.setInput(input.name, value)}
            register={(focus) => form.register(input.name, focus)}
          />
        )
      })}
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
