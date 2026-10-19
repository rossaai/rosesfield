import type { AppListing, InputDefinition } from "@rosesfield/contract"
import type { ReactElement } from "react"
import { isAssetInput } from "@/catalog/app-facts"
import { t, tCatalog } from "@/copy/t"
import { CollapsibleSection } from "@/pieces/collapsible-section"
import type { FieldValue } from "@/screens/app/app-form"
import { ChoiceField } from "@/screens/app/fields/choice-field"
import { textOf } from "@/screens/app/fields/field-props"
import { inputCaption } from "@/screens/app/fields/input-copy"
import { InputField } from "@/screens/app/fields/input-field"
import { CountField } from "@/screens/app/fields/output-fields"
import { SeedField } from "@/screens/app/fields/seed-field"
import { randomSeed } from "@/screens/app/inputs-panel"
import type { AppForm } from "@/screens/app/use-app-form"
import { PhotoField } from "@/studio/relight/photo-field"
import type { RelightPhoto } from "@/studio/relight/use-relight-photo"

export const columnInputs: readonly string[] = [
  "direction",
  "softness",
  "color",
  "brightness",
  "prompt",
]

type RelightPanelProps = {
  app: AppListing
  form: AppForm
  lastSeed: number | null
  photo: RelightPhoto
}

function findInput(app: AppListing, name: string): InputDefinition | null {
  return app.inputs.find((input) => input.name === name) ?? null
}

function fieldProps(props: RelightPanelProps, input: InputDefinition) {
  const { app, form } = props
  return {
    app,
    value: form.values.inputs[input.name],
    problem: form.problems.get(input.name),
    onChange: (value: FieldValue) => form.setInput(input.name, value),
    register: (focus: () => void) => form.register(input.name, focus),
  }
}

function AdvancedChoice({
  props,
  name,
}: {
  props: RelightPanelProps
  name: "quality" | "model"
}): ReactElement | null {
  const input = findInput(props.app, name)
  if (input?.type !== "choice" || input.options.length < 2) {
    return null
  }
  const value = textOf(props.form.values.inputs[input.name]) || input.default
  return (
    <ChoiceField
      label={inputCaption(input)}
      items={input.options.map((option) => ({
        value: option.value,
        label: tCatalog(option.labelKey),
      }))}
      value={value}
      onChange={(next) => props.form.setInput(input.name, next)}
      note={
        name === "model"
          ? tCatalog(`${props.app.id}.model.${value}.line`)
          : null
      }
      register={(focus) => props.form.register(input.name, focus)}
    />
  )
}

function AdvancedPart(props: RelightPanelProps): ReactElement {
  const { form } = props
  const seedInput = findInput(props.app, "seed")
  const seed = seedInput?.type === "seed" ? seedInput : null
  const seedValue = seed === null ? undefined : form.values.inputs[seed.name]
  return (
    <CollapsibleSection title={t("field.advanced")}>
      <AdvancedChoice props={props} name="quality" />
      <AdvancedChoice props={props} name="model" />
      {seed === null ? null : (
        <SeedField
          mode={form.values.seedMode}
          value={seedValue}
          onMode={(mode) => {
            form.setForm({ seedMode: mode })
            if (mode === "fixed" && typeof seedValue !== "number") {
              form.setInput(seed.name, props.lastSeed ?? randomSeed())
            }
          }}
          onChange={(next) => form.setInput(seed.name, next)}
        />
      )}
    </CollapsibleSection>
  )
}

export function RelightPanel(props: RelightPanelProps): ReactElement {
  const { app, form } = props
  const photo = findInput(app, "image")
  const inputs = columnInputs
    .map((name) => findInput(app, name))
    .filter((input): input is InputDefinition => input !== null)
  return (
    <div className="flex flex-col gap-s4">
      {photo !== null && isAssetInput(photo) ? (
        <PhotoField
          {...fieldProps(props, photo)}
          input={photo}
          size={props.photo.photoSize}
          message={props.photo.message}
          onMessage={props.photo.onMessage}
        />
      ) : null}
      {inputs.map((input) => (
        <InputField
          key={input.name}
          {...fieldProps(props, input)}
          input={input}
        />
      ))}
      <CountField
        app={app}
        value={form.values.count}
        onChange={(count) => form.setForm({ count })}
      />
      <AdvancedPart {...props} />
    </div>
  )
}
