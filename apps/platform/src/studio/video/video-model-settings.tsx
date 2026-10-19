import type { AppListing, InputDefinition } from "@rosesfield/contract"
import {
  RadioGroup,
  RadioGroupItem,
} from "@rosesfield/ui/components/radio-group"
import { type ReactElement, useEffect } from "react"
import { hasCatalogText, t, tCatalog } from "@/copy/t"
import { aspectField, countField } from "@/screens/app/app-form"
import {
  ModelPopoverChip,
  modelChipText,
  settingsInputs,
} from "@/screens/app/bar/model-settings"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { textOf } from "@/screens/app/fields/field-props"
import { inputCaption } from "@/screens/app/fields/input-copy"
import { InputField } from "@/screens/app/fields/input-field"
import { AspectField, CountField } from "@/screens/app/fields/output-fields"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import type { AppForm } from "@/screens/app/use-app-form"
import type { AppScreenState } from "@/screens/app/use-app-screen"
import {
  modelName,
  ruleFixes,
  rulesOf,
  shownInput,
} from "@/studio/video/video-rules"

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

function modelInputOf(app: AppListing): ChoiceInput | null {
  const input = app.inputs.find((one) => one.name === modelName)
  return input?.type === "choice" ? input : null
}

function chosenModel(app: AppListing, form: AppForm): string {
  return (
    textOf(form.values.inputs[modelName]) || (modelInputOf(app)?.default ?? "")
  )
}

type VideoSettingsProps = {
  app: AppListing
  state: AppScreenState
  chips: readonly string[]
}

function ModelField({
  app,
  form,
}: {
  app: AppListing
  form: AppForm
}): ReactElement | null {
  const model = modelInputOf(app)
  const input =
    model === null ? null : shownInput(model, rulesOf(app, form.values.inputs))
  if (input === null || input.type !== "choice") {
    return null
  }
  const lineKey = (value: string): string => `${app.id}.model.${value}.line`
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={false}
      note={null}
      problem={undefined}
    >
      <RadioGroup
        value={chosenModel(app, form)}
        onValueChange={(next) => {
          if (typeof next === "string") {
            form.setInput(modelName, next)
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
              {hasCatalogText(lineKey(option.value)) ? (
                <>
                  <span className="text-caption text-ink-muted">
                    {tCatalog(lineKey(option.value))}
                  </span>
                  <span className="text-caption text-ink-muted">
                    {t("field.model.open")}
                  </span>
                </>
              ) : null}
            </span>
          </label>
        ))}
      </RadioGroup>
    </FieldFrame>
  )
}

export function useInputRules(app: AppListing, form: AppForm): void {
  const { inputs } = form.values
  const { setInput } = form
  useEffect(() => {
    for (const [name, value] of Object.entries(ruleFixes(app, inputs))) {
      setInput(name, value)
    }
  }, [app, inputs, setInput])
}

export function VideoModelSettings({
  app,
  state,
  chips,
}: VideoSettingsProps): ReactElement {
  const { form } = state
  const rules = rulesOf(app, form.values.inputs)
  return (
    <div className="flex flex-col gap-s4">
      <ModelField app={app} form={form} />
      {settingsInputs(app, chips).map((input) => {
        const shown = input.name === modelName ? null : shownInput(input, rules)
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

export function VideoModelChip(props: VideoSettingsProps): ReactElement {
  const text = modelChipText(
    modelInputOf(props.app),
    chosenModel(props.app, props.state.form)
  )
  return (
    <ModelPopoverChip text={text}>
      <VideoModelSettings {...props} />
    </ModelPopoverChip>
  )
}
