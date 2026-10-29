import { remakeClosedKey } from "@rosesfield/catalog/remake/reach"
import type { InputDefinition } from "@rosesfield/contract"
import { type ReactElement, useRef, useState } from "react"
import { formatDuration } from "@/copy/format"
import { tCatalog } from "@/copy/t"
import { PriceCaption } from "@/pieces/price-caption"
import { ScreenState } from "@/pieces/screen-state"
import {
  AddInputsButton,
  ColumnFrame,
  type SheetControl,
} from "@/screens/app/column-frame"
import { InputField } from "@/screens/app/fields/input-field"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { ScreenHeader } from "@/shell/screen-header"
import { RemakeCanvas } from "@/studio/remake/remake-canvas"
import { useRemakeReach } from "@/studio/remake/use-remake-reach"
import {
  characterInput,
  type RemakeState,
  referenceInput,
  useRemakeScreen,
} from "@/studio/remake/use-remake-screen"

const keepSoundInput = "keepSound"

function isColumnInput(input: InputDefinition): boolean {
  return input.type !== "seed" && input.name !== keepSoundInput
}

function LimitsLine({
  state,
  input,
}: {
  state: RemakeState
  input: InputDefinition
}): ReactElement | null {
  if (input.name === characterInput) {
    return (
      <p className="text-caption text-ink-muted">
        {tCatalog("remake.input.character.limits")}
      </p>
    )
  }
  if (input.name !== referenceInput || state.referenceProblem !== undefined) {
    return null
  }
  const text =
    state.reference === null
      ? tCatalog("remake.input.reference.limits")
      : formatDuration(state.reference.seconds)
  return <p className="text-caption text-ink-muted">{text}</p>
}

function RemakeField({
  state,
  input,
}: {
  state: RemakeState
  input: InputDefinition
}): ReactElement {
  const { form } = state
  const isReference = input.name === referenceInput
  const problem =
    form.problems.get(input.name) ??
    (isReference ? state.referenceProblem : undefined)
  return (
    <div className="flex flex-col gap-s1_5">
      <InputField
        app={state.app}
        input={input}
        value={form.values.inputs[input.name]}
        problem={problem}
        onChange={(value) => form.setInput(input.name, value)}
        register={(focus) => {
          form.register(input.name, focus)
          if (isReference) {
            state.registerReference(focus)
          }
        }}
      />
      <LimitsLine state={state} input={input} />
    </div>
  )
}

function RemakePanel({ state }: { state: RemakeState }): ReactElement {
  return (
    <div className="flex flex-col gap-s4">
      {state.app.inputs.filter(isColumnInput).map((input) => (
        <RemakeField key={input.name} state={state} input={input} />
      ))}
      <AdvancedFields
        app={state.app}
        form={state.form}
        lastSeed={state.lastSeed}
      />
    </div>
  )
}

function ClosedScreen({
  app,
}: {
  app: StudioScreenProps["app"]
}): ReactElement {
  return (
    <>
      <ScreenHeader title={tCatalog(app.nameKey)} />
      <ScreenState kind="empty" title={tCatalog(remakeClosedKey)} />
    </>
  )
}

export function AppScreen(props: StudioScreenProps): ReactElement {
  const reach = useRemakeReach()
  return reach === "closed" ? (
    <ClosedScreen app={props.app} />
  ) : (
    <OpenScreen {...props} isReachKnown={reach === "open"} />
  )
}

function OpenScreen({
  app,
  seeds,
  isReachKnown,
}: StudioScreenProps & { isReachKnown: boolean }): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const state = useRemakeScreen(app, seeds, {
    isReachKnown,
    onStarted: () => sheetClose.current(),
  })
  const sheet: SheetControl = useState(true)
  sheetClose.current = () => sheet[1](false)
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      panel={<RemakePanel state={state} />}
      footLeading={
        <PriceCaption text={state.start.price} slot="remake-price" />
      }
      canvas={(openInputs) => (
        <RemakeCanvas
          app={app}
          onUseInputs={state.useInputs}
          emptyAction={<AddInputsButton onClick={openInputs} />}
        />
      )}
    />
  )
}
