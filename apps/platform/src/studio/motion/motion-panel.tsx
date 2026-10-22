import type { AppListing } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Tabs, TabsList, TabsTrigger } from "@rosesfield/ui/components/tabs"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { formatDuration } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { assetLimitsText } from "@/pieces/asset-limits"
import { CharacterPicker } from "@/pieces/character-picker"
import { DropWell } from "@/pieces/drop-well"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf } from "@/screens/app/fields/field-props"
import { inputCaption } from "@/screens/app/fields/input-copy"
import { InputField } from "@/screens/app/fields/input-field"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import { clipLimits, photoLimits } from "@/studio/motion/motion-checks"
import { isMotionTab, motionTabs, tabKeys } from "@/studio/motion/motion-tabs"
import type { MotionState } from "@/studio/motion/use-motion-screen"

type WellKind = "image" | "video"

export function MotionTabs({
  state,
}: {
  state: Pick<MotionState, "tab" | "setTab">
}): ReactElement {
  return (
    <Tabs
      value={state.tab}
      onValueChange={(next) => {
        if (isMotionTab(next)) {
          state.setTab(next)
        }
      }}
    >
      <TabsList aria-label={tCatalog("motion.tabs.label")}>
        {motionTabs.map((one) => (
          <TabsTrigger key={one} value={one}>
            {tCatalog(tabKeys[one])}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

function captionOf(app: AppListing, kind: WellKind): string {
  const input = app.inputs.find((one) => one.type === kind)
  return input === undefined ? t(`kind.${kind}`) : inputCaption(input)
}

export function clipLimitsOf(state: Pick<MotionState, "range">): string {
  return assetLimitsText({
    formats: clipLimits.mimes,
    bytes: clipLimits.maxBytes,
    ...(state.range === null ? {} : { seconds: state.range }),
  })
}

export function photoLimitsOf(): string {
  return assetLimitsText({
    formats: photoLimits.mimes,
    bytes: photoLimits.maxBytes,
  })
}

type WellProps = {
  state: MotionState
  kind: WellKind
  name: string
  limits: string
  note: string | null
  message: string | null
  children?: ReactElement | null
}

function Well(props: WellProps): ReactElement {
  const { state, name } = props
  const { form, registerWell } = state
  const trigger = useRef<HTMLButtonElement>(null)
  const [wellMessage, setWellMessage] = useState<string | null>(null)
  useEffect(() => {
    const focus = (): void => trigger.current?.focus()
    form.register(name, focus)
    registerWell(name, focus)
  }, [form, name, registerWell])
  return (
    <FieldFrame
      caption={captionOf(state.app, props.kind)}
      isOptional={false}
      note={props.note}
      problem={form.problems.get(name)}
      message={wellMessage ?? props.message}
    >
      <DropWell
        kind={props.kind}
        ids={listOf(form.values.inputs[name])}
        max={1}
        onChange={(ids) => form.setInput(name, ids)}
        onMessage={setWellMessage}
        triggerRef={trigger}
        limits={props.limits}
      />
      {props.children ?? null}
    </FieldFrame>
  )
}

function CharacterButton({ state }: { state: MotionState }): ReactElement {
  const [isOpen, setOpen] = useState(false)
  return (
    <CharacterPicker
      open={isOpen}
      onOpenChange={setOpen}
      onPick={state.pickCharacter}
      trigger={
        <Button className="self-start">{t("field.character.pick")}</Button>
      }
    />
  )
}

function ClipWell({ state }: { state: MotionState }): ReactElement {
  const seconds = state.checks.clipSeconds
  return (
    <Well
      state={state}
      kind="video"
      name={state.names.clip}
      limits={clipLimitsOf(state)}
      note={
        seconds === null || state.checks.clip !== null
          ? null
          : formatDuration(seconds)
      }
      message={state.clipMessage}
    />
  )
}

function PhotoWell({ state }: { state: MotionState }): ReactElement {
  return (
    <Well
      state={state}
      kind="image"
      name={state.names.photo}
      limits={photoLimitsOf()}
      note={null}
      message={state.photoMessage}
    >
      {state.tab === "swap" ? <CharacterButton state={state} /> : null}
    </Well>
  )
}

function RestFields({ state }: { state: MotionState }): ReactElement {
  const { form } = state
  if (!state.isGraph) {
    return <HostedFields fields={state.restFields} form={form} />
  }
  return (
    <>
      {state.graphRest.map((input) => (
        <InputField
          key={input.name}
          app={state.app}
          input={input}
          value={form.values.inputs[input.name]}
          problem={form.problems.get(input.name)}
          onChange={(value) => form.setInput(input.name, value)}
          register={(focus) => form.register(input.name, focus)}
        />
      ))}
      <AdvancedFields app={state.app} form={form} lastSeed={state.lastSeed} />
    </>
  )
}

export function MotionPanel({ state }: { state: MotionState }): ReactElement {
  return (
    <div className="flex flex-col gap-s4">
      <ClipWell key={`clip-${state.names.clip}`} state={state} />
      <PhotoWell key={`photo-${state.names.photo}`} state={state} />
      {state.hosted.isTaskApp ? (
        <CatalogPicker hosted={state.hosted} place="row" />
      ) : null}
      <RestFields state={state} />
    </div>
  )
}
