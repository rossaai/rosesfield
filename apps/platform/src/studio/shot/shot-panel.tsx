import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { Switch } from "@rosesfield/ui/components/switch"
import { CircleAlertIcon } from "lucide-react"
import { type ReactElement, type ReactNode, useId } from "react"
import { t, tCatalog } from "@/copy/t"
import { CollapsibleSection } from "@/pieces/collapsible-section"
import { ChoiceField } from "@/screens/app/fields/choice-field"
import { textOf } from "@/screens/app/fields/field-props"
import { inputCaption } from "@/screens/app/fields/input-copy"
import { InputField } from "@/screens/app/fields/input-field"
import { AspectField, CountField } from "@/screens/app/fields/output-fields"
import { SeedField } from "@/screens/app/fields/seed-field"
import { randomSeed } from "@/screens/app/inputs-panel"
import type { ShotScreenState } from "@/studio/shot/use-shot-screen"
import { shotModelOf } from "../../../../../packages/catalog/src/shot/shot-models"
import {
  keyOf,
  type ShotChoices,
  sentWords,
  shotListOrder,
} from "../../../../../packages/catalog/src/shot/shot-words"

type PanelProps = {
  app: AppListing
  state: ShotScreenState
}

const advancedInputs: readonly string[] = ["resolution", "sound", "seed"]

function Problem({ message }: { message: string | undefined }): ReactNode {
  if (message === undefined) {
    return null
  }
  return (
    <p
      role="alert"
      className="flex items-start gap-s1_5 text-label text-bug-text"
    >
      <CircleAlertIcon aria-hidden="true" className="glyph-small" />
      <span>{message}</span>
    </p>
  )
}

function choicesOf(state: ShotScreenState): ShotChoices {
  const inputs = state.form.values.inputs
  return Object.fromEntries(
    shotListOrder.map((list) => [list, textOf(inputs[list])])
  )
}

export function SentWords({ app, state }: PanelProps): ReactNode {
  const inputs = state.form.values.inputs
  const scene = textOf(inputs.prompt)
  if (scene.trim() === "") {
    return null
  }
  const model = shotModelOf(inputs)
  const words = sentWords({
    scene,
    choices: choicesOf(state),
    movementAsWords: model.movementInput === "words",
    closes: model.closing === "sentence",
  })
  const movement = textOf(inputs.movement)
  const movementInput = app.inputs.find((input) => input.name === "movement")
  const option =
    movementInput?.type === "choice"
      ? movementInput.options.find((one) => one.value === movement)
      : undefined
  const camera =
    model.movementInput === "camera" &&
    movement !== "auto" &&
    option !== undefined
      ? tCatalog("shot.sentWords.camera", {
          movement: tCatalog(option.labelKey),
        })
      : null
  return (
    <section
      aria-label={tCatalog("shot.sentWords.label")}
      className="flex flex-col gap-s1_5"
    >
      <p className="text-label text-ink-muted">
        {tCatalog("shot.sentWords.label")}
      </p>
      <p
        aria-live="polite"
        className="whitespace-pre-wrap rounded-cell bg-surface px-s3 py-s2 text-caption text-ink"
      >
        {words}
      </p>
      {camera === null ? null : (
        <p className="text-label text-ink-muted">{camera}</p>
      )}
    </section>
  )
}

function ModelField({
  input,
  state,
}: {
  input: Extract<InputDefinition, { type: "choice" }>
  state: ShotScreenState
}): ReactElement {
  const model = shotModelOf(state.form.values.inputs)
  return (
    <ChoiceField
      label={inputCaption(input)}
      items={input.options.map((option) => ({
        value: option.value,
        label: tCatalog(option.labelKey),
      }))}
      value={model.id}
      onChange={(value) => state.form.setInput(input.name, value)}
      note={tCatalog(`shot.model.${keyOf(model.id)}.line`)}
      register={state.register(input.name)}
    />
  )
}

function SoundField({ state }: { state: ShotScreenState }): ReactElement {
  const id = useId()
  const inputs = state.form.values.inputs
  const isOn = state.hasSound && textOf(inputs.sound) !== "off"
  return (
    <div className="flex flex-col gap-s1_5">
      <div className="flex items-center justify-between gap-s3">
        <label htmlFor={id} className="text-label text-ink-muted">
          {tCatalog("shot.input.sound.label")}
        </label>
        <Switch
          id={id}
          checked={isOn}
          disabled={!state.hasSound}
          onCheckedChange={(checked) =>
            state.form.setInput("sound", checked ? "on" : "off")
          }
        />
      </div>
      <p className="text-label text-ink-muted">
        {tCatalog(
          state.hasSound
            ? "shot.input.sound.note"
            : "shot.input.sound.noteSilent"
        )}
      </p>
    </div>
  )
}

function ShotInput({
  app,
  state,
  input,
}: PanelProps & { input: InputDefinition }): ReactElement {
  const { form } = state
  const field =
    input.name === "model" && input.type === "choice" ? (
      <ModelField input={input} state={state} />
    ) : (
      <InputField
        app={app}
        input={input}
        value={form.values.inputs[input.name]}
        problem={form.problems.get(input.name)}
        onChange={(value) => form.setInput(input.name, value)}
        register={state.register(input.name)}
      />
    )
  return (
    <div className="flex flex-col gap-s1_5">
      {field}
      <Problem message={state.messages.get(input.name)} />
      {input.name === "prompt" ? <SentWords app={app} state={state} /> : null}
    </div>
  )
}

function AdvancedInputs({ app, state }: PanelProps): ReactElement {
  const { form } = state
  const resolution = app.inputs.find((input) => input.name === "resolution")
  const seed = form.values.inputs.seed
  return (
    <CollapsibleSection title={t("field.advanced")}>
      {resolution === undefined ? null : (
        <ShotInput app={app} state={state} input={resolution} />
      )}
      <SoundField state={state} />
      <SeedField
        mode={form.values.seedMode}
        value={seed}
        onMode={(mode) => {
          form.setForm({ seedMode: mode })
          if (mode === "fixed" && typeof seed !== "number") {
            form.setInput("seed", state.lastSeed ?? randomSeed())
          }
        }}
        onChange={(next) => form.setInput("seed", next)}
      />
    </CollapsibleSection>
  )
}

export function ShotPanel({ app, state }: PanelProps): ReactElement {
  const { form } = state
  const shown = app.inputs.filter(
    (input) => !advancedInputs.includes(input.name)
  )
  return (
    <div className="flex flex-col gap-s4">
      {shown.map((input) => (
        <div key={input.name} className="contents">
          {input.name === "length" ? (
            <AspectField
              app={app}
              value={form.values.aspectRatio}
              onChange={(aspectRatio) => form.setForm({ aspectRatio })}
            />
          ) : null}
          <ShotInput app={app} state={state} input={input} />
        </div>
      ))}
      <CountField
        app={app}
        value={form.values.count}
        onChange={(count) => form.setForm({ count })}
      />
      <AdvancedInputs app={app} state={state} />
    </div>
  )
}
