import type { InputDefinition } from "@rosesfield/contract"
import { Field, FieldMessage, FieldNote } from "@rosesfield/ui/components/field"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { formatBytes } from "@/copy/format"
import { copyLocale, hasCatalogText, t, tCatalog } from "@/copy/t"
import { assetLimitsText } from "@/pieces/asset-limits"
import { CollapsibleSection } from "@/pieces/collapsible-section"
import { DropWell } from "@/pieces/drop-well"
import { ChoiceControl } from "@/screens/app/fields/choice-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { type InputFieldProps, listOf } from "@/screens/app/fields/field-props"
import { inputCaption, inputNote } from "@/screens/app/fields/input-copy"
import { InputField } from "@/screens/app/fields/input-field"
import { CountField } from "@/screens/app/fields/output-fields"
import { SeedField } from "@/screens/app/fields/seed-field"
import { randomSeed } from "@/screens/app/inputs-panel"
import {
  aspectInput,
  formatOf,
  modeInput,
  photoInput,
  sideInputs,
} from "@/studio/expand/expand-modes"
import type { ExpandState } from "@/studio/expand/use-expand-screen"
import {
  expandLimits,
  type PhotoProblem,
  type Plan,
  photoLimits,
} from "../../../../../packages/catalog/src/expand/expand-plan"

const oneDecimal = new Intl.NumberFormat(copyLocale, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

function inputNamed(state: ExpandState, name: string): InputDefinition | null {
  return state.app.inputs.find((input) => input.name === name) ?? null
}

function formatLabel(state: ExpandState, format: string): string {
  const input = inputNamed(state, aspectInput)
  const option =
    input?.type === "choice"
      ? input.options.find((one) => one.value === format)
      : undefined
  return option === undefined || !hasCatalogText(option.labelKey)
    ? format
    : tCatalog(option.labelKey)
}

export function photoMessageOf(problem: PhotoProblem): string {
  switch (problem.kind) {
    case "wrongKind":
      return t("field.asset.wrongKind", {
        kinds: tCatalog("expand.input.photo.kinds"),
      })
    case "tooLarge":
      return t("field.asset.tooLarge", {
        size: formatBytes(problem.bytes),
        limit: formatBytes(problem.limit),
      })
    case "tooSmall":
      return tCatalog("expand.input.photo.tooSmall", {
        size: problem.side,
        min: problem.min,
      })
  }
}

function wellProblemOf(state: ExpandState): string | null {
  if (state.photoProblem !== null) {
    return photoMessageOf(state.photoProblem)
  }
  return state.photoState === "unreadable"
    ? tCatalog("expand.input.photo.unreadable")
    : null
}

type NoteKeys = { fits: string; scaled: string; limit: string }

const formatNotes: NoteKeys = {
  fits: "expand.input.aspect.note",
  scaled: "expand.input.aspect.noteSize",
  limit: "expand.input.aspect.noteScaled",
}

const sidesNotes: NoteKeys = {
  fits: "expand.input.left.note",
  scaled: "expand.input.left.note",
  limit: "expand.input.sides.noteScaled",
}

function sizeNote(plan: Plan, keys: NoteKeys): string {
  const size = { width: plan.canvas.width, height: plan.canvas.height }
  if (!plan.isScaled) {
    return tCatalog(keys.fits, size)
  }
  return [
    tCatalog(keys.scaled, size),
    tCatalog(keys.limit, { max: expandLimits.maxLongSide }),
  ].join(" ")
}

function ModeControl({ state }: { state: ExpandState }): ReactElement | null {
  const input = inputNamed(state, modeInput)
  if (input?.type !== "choice") {
    return null
  }
  return (
    <ChoiceControl
      label={inputCaption(input)}
      items={input.options.map((option) => ({
        value: option.value,
        label: tCatalog(option.labelKey),
      }))}
      value={state.mode}
      onChange={(value) => state.form.setInput(modeInput, value)}
    />
  )
}

function PhotoWell({ state }: { state: ExpandState }): ReactElement | null {
  const input = inputNamed(state, photoInput)
  const trigger = useRef<HTMLButtonElement>(null)
  const [wellMessage, setWellMessage] = useState<string | null>(null)
  const { form, registerWell } = state
  useEffect(() => {
    const focus = (): void => trigger.current?.focus()
    form.register(photoInput, focus)
    registerWell(focus)
  }, [form, registerWell])
  if (input?.type !== "image") {
    return null
  }
  const note = inputNote(state.app, input)
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={false}
      note={note}
      problem={form.problems.get(photoInput)}
      message={wellMessage ?? wellProblemOf(state)}
    >
      <DropWell
        kind="image"
        ids={listOf(form.values.inputs[photoInput])}
        max={input.max}
        onChange={(ids) => form.setInput(photoInput, ids)}
        onMessage={setWellMessage}
        triggerRef={trigger}
        limits={assetLimitsText({
          formats: photoLimits.formats,
          bytes: photoLimits.maxBytes,
          shortSide: photoLimits.minShortSide,
        })}
      />
    </FieldFrame>
  )
}

function formatMessage(state: ExpandState): string | null {
  const check = state.formatCheck
  if (check?.state === "same") {
    return tCatalog("expand.input.aspect.same", {
      format: formatLabel(
        state,
        formatOf(state.form.values.inputs[aspectInput])
      ),
    })
  }
  if (check?.state === "tooFar") {
    return tCatalog("expand.input.aspect.tooFar", {
      times: oneDecimal.format(check.times),
      axis: tCatalog(`expand.axis.${check.axis}`),
    })
  }
  return null
}

function FormatField({ state }: { state: ExpandState }): ReactElement | null {
  const input = inputNamed(state, aspectInput)
  const check = state.formatCheck
  if (input?.type !== "choice") {
    return null
  }
  const note =
    check?.state === "fits"
      ? sizeNote(check.plan, formatNotes)
      : tCatalog("expand.input.aspect.noteEmpty")
  const label = inputCaption(input)
  return (
    <FieldFrame
      caption={label}
      isOptional={false}
      note={note}
      problem={undefined}
      message={formatMessage(state)}
    >
      <ChoiceControl
        label={label}
        items={input.options.map((option) => ({
          value: option.value,
          label: tCatalog(option.labelKey),
        }))}
        value={formatOf(state.form.values.inputs[aspectInput])}
        onChange={state.setFormat}
        register={state.registerFormat}
      />
    </FieldFrame>
  )
}

function SidesNote({ state }: { state: ExpandState }): ReactElement {
  const check = state.sidesCheck
  const isMissing = state.hasAskedForSpace && check?.state === "noSpace"
  return (
    <Field invalid={isMissing} className="max-w-none">
      {isMissing ? (
        <FieldMessage>{tCatalog("expand.input.sides.required")}</FieldMessage>
      ) : (
        <FieldNote>
          {check?.state === "fits"
            ? sizeNote(check.plan, sidesNotes)
            : tCatalog("expand.input.left.noteEmpty")}
        </FieldNote>
      )}
    </Field>
  )
}

const keepOwnFocus = (): undefined => undefined

export function SideField(props: InputFieldProps): ReactElement {
  const box = useRef<HTMLDivElement>(null)
  const { register } = props
  useEffect(() => {
    register(() =>
      box.current
        ?.querySelector<HTMLElement>('input[type="range"], button')
        ?.focus()
    )
  }, [register])
  return (
    <div ref={box}>
      <InputField {...props} register={keepOwnFocus} />
    </div>
  )
}

function SideFields({ state }: { state: ExpandState }): ReactElement {
  const { form, registerTop } = state
  return (
    <>
      {sideInputs.map((name) => {
        const input = inputNamed(state, name)
        return input === null ? null : (
          <SideField
            key={name}
            app={state.app}
            input={input}
            value={form.values.inputs[name]}
            problem={form.problems.get(name)}
            onChange={(value) => form.setInput(name, value)}
            register={(focus) => {
              form.register(name, focus)
              if (name === "top") {
                registerTop(focus)
              }
            }}
          />
        )
      })}
      <SidesNote state={state} />
    </>
  )
}

function SceneField({ state }: { state: ExpandState }): ReactElement | null {
  const input = inputNamed(state, "scene")
  const { form } = state
  if (input === null) {
    return null
  }
  return (
    <InputField
      app={state.app}
      input={input}
      value={form.values.inputs.scene}
      problem={form.problems.get("scene")}
      onChange={(value) => form.setInput("scene", value)}
      register={(focus) => form.register("scene", focus)}
    />
  )
}

function SeedInput({ state }: { state: ExpandState }): ReactElement | null {
  const seed = state.app.inputs.find((input) => input.type === "seed")
  if (seed === undefined) {
    return null
  }
  const { form } = state
  const value = form.values.inputs[seed.name]
  return (
    <SeedField
      mode={form.values.seedMode}
      value={value}
      onMode={(mode) => {
        form.setForm({ seedMode: mode })
        if (mode === "fixed" && typeof value !== "number") {
          form.setInput(seed.name, state.lastSeed ?? randomSeed())
        }
      }}
      onChange={(next) => form.setInput(seed.name, next)}
    />
  )
}

export function ExpandPanel({ state }: { state: ExpandState }): ReactElement {
  return (
    <div className="flex flex-col gap-s4">
      <ModeControl state={state} />
      <PhotoWell state={state} />
      {state.mode === "format" ? (
        <FormatField state={state} />
      ) : (
        <SideFields state={state} />
      )}
      <SceneField state={state} />
      <CountField
        app={state.app}
        value={state.form.values.count}
        onChange={(count) => state.form.setForm({ count })}
      />
      <CollapsibleSection title={t("field.advanced")}>
        <SeedInput state={state} />
      </CollapsibleSection>
    </div>
  )
}
