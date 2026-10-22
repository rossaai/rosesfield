import type { AppListing, InputDefinition } from "@rosesfield/contract"
import type { ReactElement } from "react"
import { isAssetInput } from "@/catalog/app-facts"
import { t, tCatalog } from "@/copy/t"
import { CollapsibleSection } from "@/pieces/collapsible-section"
import { ChoiceField } from "@/screens/app/fields/choice-field"
import { textOf } from "@/screens/app/fields/field-props"
import { inputCaption } from "@/screens/app/fields/input-copy"
import { InputField } from "@/screens/app/fields/input-field"
import { SeedField } from "@/screens/app/fields/seed-field"
import { randomSeed } from "@/screens/app/inputs-panel"
import type { AppForm } from "@/screens/app/use-app-form"
import { EffectTiles, effectTiles } from "@/studio/effects/effect-tiles"
import { PhotoField } from "@/studio/effects/photo-field"

export const autoAspect = "auto"

type EffectsPanelProps = {
  app: AppListing
  form: AppForm
  lastSeed: number | null
  aspect: string
  aspects: readonly string[]
  onAspect: (aspect: string) => void
  photoMessage: string | null
  onPhotoMessage: (message: string | null) => void
}

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

function findInput(app: AppListing, name: string): InputDefinition | null {
  return app.inputs.find((input) => input.name === name) ?? null
}

function choiceOf(app: AppListing, name: string): ChoiceInput | null {
  const input = findInput(app, name)
  return input?.type === "choice" ? input : null
}

function fieldProps(props: EffectsPanelProps, input: InputDefinition) {
  const { app, form } = props
  return {
    app,
    value: form.values.inputs[input.name],
    problem: form.problems.get(input.name),
    onChange: (value: string | number | string[] | undefined) =>
      form.setInput(input.name, value),
    register: (focus: () => void) => form.register(input.name, focus),
  }
}

function AspectChoice(props: EffectsPanelProps): ReactElement {
  const items = [autoAspect, ...props.aspects].map((value) => ({
    value,
    label:
      value === autoAspect
        ? t("choice.auto")
        : tCatalog(`choice.aspect.${value.replace(":", "-")}`),
  }))
  return (
    <ChoiceField
      label={tCatalog("effects.input.aspect.label")}
      items={items}
      value={props.aspect}
      onChange={props.onAspect}
      note={null}
    />
  )
}

function ChoiceInputField(
  props: EffectsPanelProps & {
    name: string
    labelOf?: (value: string) => string
  }
): ReactElement | null {
  const input = choiceOf(props.app, props.name)
  if (input === null) {
    return null
  }
  const value = textOf(props.form.values.inputs[input.name]) || input.default
  return (
    <ChoiceField
      label={inputCaption(input)}
      items={input.options.map((option) => ({
        value: option.value,
        label: props.labelOf?.(option.value) ?? tCatalog(option.labelKey),
      }))}
      value={value}
      onChange={(next) => props.form.setInput(input.name, next)}
      note={null}
      register={(focus) => props.form.register(input.name, focus)}
    />
  )
}

function EffectPart(props: EffectsPanelProps): ReactElement | null {
  const { app, form } = props
  const effect = choiceOf(app, "effect")
  if (effect === null) {
    return null
  }
  return (
    <EffectTiles
      app={app}
      value={textOf(form.values.inputs[effect.name]) || effect.default}
      onChange={(value) => form.setInput(effect.name, value)}
      register={(focus) => form.register(effect.name, focus)}
    />
  )
}

function AdvancedPart(props: EffectsPanelProps): ReactElement {
  const { form } = props
  const seedInput = findInput(props.app, "seed")
  const seed = seedInput?.type === "seed" ? seedInput : null
  const seedValue = seed === null ? undefined : form.values.inputs[seed.name]
  return (
    <CollapsibleSection title={t("field.advanced")}>
      <ChoiceInputField
        {...props}
        name="resolution"
        labelOf={(value) => tCatalog(`choice.resolution.${value}`)}
      />
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

function chosenPhotoOf(props: EffectsPanelProps): string | undefined {
  const effect = choiceOf(props.app, "effect")
  const chosen =
    effect === null
      ? ""
      : textOf(props.form.values.inputs[effect.name]) || effect.default
  return effectTiles(props.app).find((tile) => tile.effect === chosen)?.photo
}

export function EffectsPanel(props: EffectsPanelProps): ReactElement {
  const { app } = props
  const photo = app.inputs.find((input) => input.name === "image")
  const columnInputs = app.inputs.filter((input) => input.name === "prompt")
  return (
    <div className="flex flex-col gap-s4">
      <EffectPart {...props} />
      {photo !== undefined && isAssetInput(photo) ? (
        <PhotoField
          {...fieldProps(props, photo)}
          input={photo}
          title={chosenPhotoOf(props)}
          message={props.photoMessage}
          onMessage={props.onPhotoMessage}
        />
      ) : null}
      {columnInputs.map((input) => (
        <InputField
          key={input.name}
          {...fieldProps(props, input)}
          input={input}
        />
      ))}
      <AspectChoice {...props} />
      <AdvancedPart {...props} />
    </div>
  )
}
