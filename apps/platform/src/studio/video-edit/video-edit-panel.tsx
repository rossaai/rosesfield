import type { InputDefinition } from "@rosesfield/contract"
import type { ReactElement } from "react"
import { formatDuration } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { assetLimitsText } from "@/pieces/asset-limits"
import { CollapsibleSection } from "@/pieces/collapsible-section"
import { ChoiceControl } from "@/screens/app/fields/choice-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { textOf } from "@/screens/app/fields/field-props"
import { inputCaption, inputNote } from "@/screens/app/fields/input-copy"
import { InputField } from "@/screens/app/fields/input-field"
import { SeedField } from "@/screens/app/fields/seed-field"
import { randomSeed } from "@/screens/app/inputs-panel"
import { clipMimes } from "@/studio/recast/recast-checks"
import {
  largestClipBytes,
  longestClipSeconds,
  shortestClipSeconds,
} from "@/studio/video-edit/use-clip-facts"
import type { VideoEditState } from "@/studio/video-edit/use-video-edit-screen"
import {
  advancedInputsOf,
  aspectInput,
  hasSeed,
  seedInput,
  shownInputsOf,
  sourceInput,
} from "@/studio/video-edit/video-edit-modes"

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

function ClipLine({ state }: { state: VideoEditState }): ReactElement | null {
  if (state.clipProblem !== undefined) {
    return null
  }
  const text =
    state.clip === null
      ? assetLimitsText({
          formats: clipMimes,
          bytes: largestClipBytes,
          seconds: { min: shortestClipSeconds, max: longestClipSeconds },
        })
      : formatDuration(state.clip.seconds)
  return <p className="text-caption text-ink-muted">{text}</p>
}

function FormatField({
  state,
  input,
}: {
  state: VideoEditState
  input: ChoiceInput
}): ReactElement {
  const items = input.options.map((option) => ({
    value: option.value,
    label: tCatalog(option.labelKey),
  }))
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={false}
      note={inputNote(state.app, input)}
      problem={undefined}
      message={
        state.isSameFormat ? tCatalog("video-edit.input.aspect.same") : null
      }
    >
      <ChoiceControl
        label={inputCaption(input)}
        items={items}
        value={textOf(state.form.values.inputs[input.name]) || input.default}
        onChange={(value) => state.form.setInput(input.name, value)}
        register={(focus) => state.register(input.name, focus)}
      />
    </FieldFrame>
  )
}

function EditField({
  state,
  input,
}: {
  state: VideoEditState
  input: InputDefinition
}): ReactElement {
  const { form } = state
  if (input.name === aspectInput && input.type === "choice") {
    return <FormatField state={state} input={input} />
  }
  const isSource = input.name === sourceInput
  const problem =
    form.problems.get(input.name) ?? (isSource ? state.clipProblem : undefined)
  return (
    <div className="flex flex-col gap-s1_5">
      <InputField
        app={state.app}
        input={input}
        value={form.values.inputs[input.name]}
        problem={problem}
        onChange={(value) => form.setInput(input.name, value)}
        register={(focus) => state.register(input.name, focus)}
      />
      {isSource ? <ClipLine state={state} /> : null}
    </div>
  )
}

function AdvancedSection({
  state,
}: {
  state: VideoEditState
}): ReactElement | null {
  const inputs = advancedInputsOf(state.app, state.mode)
  if (inputs.length === 0 && !hasSeed(state.mode)) {
    return null
  }
  const { form } = state
  const seed = form.values.inputs[seedInput]
  return (
    <CollapsibleSection title={t("field.advanced")}>
      {inputs.map((input) => (
        <EditField key={input.name} state={state} input={input} />
      ))}
      {hasSeed(state.mode) ? (
        <SeedField
          mode={form.values.seedMode}
          value={seed}
          onMode={(mode) => {
            form.setForm({ seedMode: mode })
            if (mode === "fixed" && typeof seed !== "number") {
              form.setInput(seedInput, state.lastSeed ?? randomSeed())
            }
          }}
          onChange={(next) => form.setInput(seedInput, next)}
        />
      ) : null}
    </CollapsibleSection>
  )
}

export function VideoEditPanel({
  state,
}: {
  state: VideoEditState
}): ReactElement {
  return (
    <div className="flex flex-col gap-s4">
      {shownInputsOf(state.app, state.mode).map((input) => (
        <EditField key={input.name} state={state} input={input} />
      ))}
      <AdvancedSection state={state} />
    </div>
  )
}
