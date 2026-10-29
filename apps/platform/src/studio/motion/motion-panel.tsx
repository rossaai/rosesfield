import {
  clipPlanLimits,
  exampleInput,
  exampleKeyOf,
} from "@rosesfield/catalog/motion"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { MediaTile } from "@rosesfield/ui/components/media-tile"
import {
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"
import { t, tCatalog } from "@/copy/t"
import { assetLimitsText } from "@/pieces/asset-limits"
import { CharacterPicker } from "@/pieces/character-picker"
import { DropWell } from "@/pieces/drop-well"
import { PriceCaption } from "@/pieces/price-caption"
import { appliedApp } from "@/screens/app/app-form"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf } from "@/screens/app/fields/field-props"
import { inputCaption } from "@/screens/app/fields/input-copy"
import { InputField } from "@/screens/app/fields/input-field"
import { AppSettingsSection } from "@/screens/app/fields/setting-rows"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import { appSettingsPlan, isSettingInput } from "@/screens/app/settings-plan"
import { mediaOf } from "@/showcase/showcase"
import { clipLimits, photoLimits } from "@/studio/motion/motion-checks"
import { modeInput, soundInput } from "@/studio/motion/motion-tabs"
import type { MotionState } from "@/studio/motion/use-motion-screen"

type WellKind = "image" | "video"

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
  message: string | null
  caption?: string
  note?: string | null
  max?: number
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
      caption={props.caption ?? captionOf(state.app, props.kind)}
      isOptional={false}
      note={props.note ?? null}
      problem={form.problems.get(name)}
      message={wellMessage ?? props.message}
    >
      <DropWell
        kind={props.kind}
        ids={listOf(form.values.inputs[name])}
        max={props.max ?? 1}
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
  const guide =
    state.mode === "guide"
      ? {
          caption: tCatalog("motion.input.guide.label"),
          note: tCatalog("motion.input.guide.note"),
        }
      : {}
  return (
    <Well
      state={state}
      kind="video"
      name={state.names.clip}
      limits={clipLimitsOf(state)}
      message={state.clipMessage}
      {...guide}
    />
  )
}

function ExampleWell({
  state,
  example,
}: {
  state: MotionState
  example: NonNullable<MotionState["example"]>
}): ReactElement {
  const key = exampleKeyOf(example.id)
  const name = tCatalog(`motion.example.${key}.name`)
  const { preview } = example
  const src = preview === null ? null : mediaOf(preview.file)
  return (
    <FieldFrame
      caption={tCatalog("motion.input.clip.label")}
      isOptional={false}
      note={tCatalog(`motion.example.${key}.photo`)}
      problem={undefined}
      message={null}
    >
      <div data-slot="motion-example" className="flex items-center gap-s3">
        {preview === null || src === null ? null : (
          <MediaTile
            kind="video"
            src={src}
            alt={name}
            aspect={{ width: preview.width, height: preview.height }}
            className="w-thumb shrink-0"
          />
        )}
        <span className="min-w-0 truncate font-medium text-body text-ink">
          {name}
        </span>
      </div>
      <Button className="self-start" onClick={state.useOwnVideo}>
        {tCatalog("motion.example.change")}
      </Button>
    </FieldFrame>
  )
}

/** Your own video takes 1 to 15 photos of people, products or clothes, and every other path takes one. */
function photosOf(state: MotionState): Partial<WellProps> {
  return state.isOwnChain
    ? {
        caption: tCatalog("motion.input.photos.label"),
        note: tCatalog("motion.input.photos.note"),
        max: clipPlanLimits.mostPhotos,
      }
    : {}
}

function PhotoWell({ state }: { state: MotionState }): ReactElement {
  return (
    <Well
      state={state}
      kind="image"
      name={state.names.photo}
      limits={photoLimitsOf()}
      message={state.photoMessage}
      {...photosOf(state)}
    >
      <CharacterButton state={state} />
    </Well>
  )
}

const changeInput = "change"

/** On your own video the prompt says what to change, so it shows under its own words. */
function shownInputOf(
  state: MotionState,
  input: InputDefinition
): InputDefinition {
  return state.isOwnChain && input.name === "scene"
    ? { ...input, name: changeInput, labelKey: "motion.input.change.label" }
    : input
}

function RestFields({
  state,
  model,
}: {
  state: MotionState
  model: ReactNode
}): ReactElement {
  const { form } = state
  const applied = appliedApp(state.app, form.values.inputs)
  const applies = (name: string): boolean =>
    applied.inputs.some((input) => input.name === name)
  if (!state.isGraph) {
    return (
      <HostedFields
        fields={state.restFields}
        form={form}
        app={state.app}
        model={model}
      />
    )
  }
  return (
    <>
      {state.graphRest
        .filter((input) => !isSettingInput(input) && applies(input.name))
        .map((input) => (
          <InputField
            key={input.name}
            app={state.app}
            input={shownInputOf(state, input)}
            value={form.values.inputs[input.name]}
            problem={form.problems.get(input.name)}
            onChange={(value) => form.setInput(input.name, value)}
            register={(focus) => form.register(input.name, focus)}
          />
        ))}
      {model}
      <AppSettingsSection
        app={state.app}
        form={form}
        lastSeed={state.lastSeed}
        plan={appSettingsPlan(
          applied,
          state.mode === "guide"
            ? [modeInput, exampleInput, soundInput]
            : [modeInput, exampleInput]
        )}
      />
    </>
  )
}

export function MotionPanel({ state }: { state: MotionState }): ReactElement {
  return (
    <div className="flex flex-col gap-s4">
      {state.example === null ? (
        <ClipWell key={`clip-${state.names.clip}`} state={state} />
      ) : (
        <ExampleWell state={state} example={state.example} />
      )}
      <PhotoWell key={`photo-${state.names.photo}`} state={state} />
      <RestFields
        state={state}
        model={
          state.hosted.isTaskApp && state.example === null ? (
            <CatalogPicker hosted={state.hosted} place="row" />
          ) : null
        }
      />
      <PriceCaption
        text={state.chain?.priceNote ?? null}
        slot="motion-price"
        wraps={true}
      />
    </div>
  )
}
