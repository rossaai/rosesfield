import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { Chip } from "@rosesfield/ui/components/chip"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@rosesfield/ui/components/popover"
import type { ReactElement, ReactNode } from "react"
import { isAssetInput } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { aspectField, countField } from "@/screens/app/app-form"
import { chipChoiceText } from "@/screens/app/bar/setting-chip"
import { textOf } from "@/screens/app/fields/field-props"
import { InputField } from "@/screens/app/fields/input-field"
import { AspectField, CountField } from "@/screens/app/fields/output-fields"
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

export function ModelPopoverChip({
  text,
  children,
}: {
  text: string
  children: ReactNode
}): ReactElement {
  return (
    <Popover>
      <PopoverTrigger render={<Chip caption={t("bar.model")}>{text}</Chip>} />
      <PopoverContent className="max-w-dialog">
        <PopoverTitle>{t("bar.model")}</PopoverTitle>
        {children}
      </PopoverContent>
    </Popover>
  )
}

export function ModelChip(props: ModelSettingsProps): ReactElement {
  const value = textOf(props.state.form.values.inputs[modelInputName])
  const model = props.app.inputs.find((input) => input.name === modelInputName)
  return (
    <ModelPopoverChip
      text={modelChipText(model?.type === "choice" ? model : null, value)}
    >
      <ModelSettings {...props} />
    </ModelPopoverChip>
  )
}
