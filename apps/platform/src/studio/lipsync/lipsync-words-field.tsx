import { IconButton } from "@rosesfield/ui/components/button"
import { SegmentedControl } from "@rosesfield/ui/components/segmented-control"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { Textarea } from "@rosesfield/ui/components/textarea"
import { XIcon } from "lucide-react"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { useAssetSource } from "@/api/use-asset-source"
import { t, tCatalog } from "@/copy/t"
import { useAssetNameOf } from "@/pieces/asset-name"
import { AudioRow } from "@/pieces/audio-row"
import { DropWell } from "@/pieces/drop-well"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf, textOf } from "@/screens/app/fields/field-props"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import {
  speechModelInput,
  type WordsMode,
  wordsLabelKey,
} from "@/studio/lipsync/lipsync-words"
import type { LipsyncScreen } from "@/studio/lipsync/use-lipsync-screen"

const modeKeys = { audio: "kind.audio", text: "kind.text" } as const

function problemOf(screen: LipsyncScreen, name: string | null) {
  return name === null
    ? undefined
    : (screen.wellProblems[name] ?? screen.form.problems.get(name))
}

function limitNote(screen: LipsyncScreen): string | null {
  const limit = screen.fields?.limit ?? null
  if (limit === null) {
    return null
  }
  const unit = tCatalog("lipsync.input.length.unit")
  return `${t("field.limits.length", limit)} ${unit}`
}

export function WordsSwitch({
  screen,
}: {
  screen: LipsyncScreen
}): ReactElement | null {
  if (screen.modes.length < 2) {
    return null
  }
  return (
    <SegmentedControl<WordsMode>
      density="composer"
      label={tCatalog(wordsLabelKey)}
      value={screen.plan.mode}
      items={screen.modes.map((mode) => ({
        value: mode,
        label: t(modeKeys[mode]),
      }))}
      onValueChange={screen.setWords}
    />
  )
}

function HeldAudio({
  id,
  seconds,
  onRemove,
  register,
}: {
  id: string
  seconds: number | null
  onRemove: () => void
  register: (focus: () => void) => void
}): ReactElement {
  const source = useAssetSource(id)
  const name = useAssetNameOf(id) ?? t("output.upload.audio")
  const holder = useRef<HTMLDivElement>(null)
  useEffect(() => {
    register(() => holder.current?.querySelector("button")?.focus())
  }, [register])
  return (
    <div
      ref={holder}
      data-slot="lipsync-audio"
      className="flex items-center gap-s2"
    >
      {source.state === "ready" ? (
        <AudioRow src={source.src} name={name} durationSeconds={seconds} />
      ) : (
        <Skeleton className="h-icon w-full" />
      )}
      <IconButton
        label={t("field.asset.remove")}
        tone="quiet"
        onClick={onRemove}
      >
        <XIcon aria-hidden="true" />
      </IconButton>
    </div>
  )
}

function AudioWords({
  screen,
}: {
  screen: LipsyncScreen
}): ReactElement | null {
  const field = screen.fields?.audio ?? null
  const trigger = useRef<HTMLButtonElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const { form, registerWell } = screen
  const name = field?.name ?? null
  const register = (focus: () => void): void => {
    if (name !== null) {
      form.register(name, focus)
      registerWell(name, focus)
    }
  }
  const held = name === null ? [] : listOf(form.values.inputs[name])
  const [first] = held
  useEffect(() => {
    if (first === undefined) {
      register(() => trigger.current?.focus())
    }
  })
  if (name === null) {
    return null
  }
  return (
    <FieldFrame
      caption={tCatalog("lipsync.input.audio.label")}
      isOptional={false}
      note={limitNote(screen)}
      problem={problemOf(screen, name)}
      message={message}
    >
      {first === undefined ? (
        <DropWell
          kind="audio"
          ids={held}
          max={1}
          onChange={(next) => form.setInput(name, next)}
          onMessage={setMessage}
          triggerRef={trigger}
        />
      ) : (
        <HeldAudio
          id={first}
          seconds={screen.audio?.seconds ?? null}
          onRemove={() => form.setInput(name, [])}
          register={register}
        />
      )}
    </FieldFrame>
  )
}

function TextWords({ screen }: { screen: LipsyncScreen }): ReactElement | null {
  const { form, plan } = screen
  const box = useRef<HTMLTextAreaElement>(null)
  const name = plan.field
  useEffect(() => {
    if (name !== null) {
      form.register(name, () => box.current?.focus())
    }
  }, [form, name])
  if (name === null) {
    return null
  }
  const problem = problemOf(screen, name)
  const label = tCatalog("voice.input.script.label")
  return (
    <FieldFrame
      caption={label}
      isOptional={false}
      note={null}
      problem={problem}
    >
      <Textarea
        ref={box}
        aria-label={label}
        aria-invalid={problem === undefined ? undefined : true}
        placeholder={tCatalog("voice.input.script.placeholder")}
        value={textOf(form.values.inputs[name])}
        onChange={(event) => form.setInput(name, event.target.value)}
      />
    </FieldFrame>
  )
}

function VoiceRow({ screen }: { screen: LipsyncScreen }): ReactElement | null {
  if (!screen.plan.isChain) {
    return null
  }
  return (
    <FieldFrame
      caption={tCatalog("voice.input.mode.label")}
      isOptional={false}
      note={null}
      problem={screen.form.problems.get(speechModelInput)}
    >
      <div data-slot="lipsync-voice">
        <CatalogPicker hosted={screen.voices} place="row" />
      </div>
    </FieldFrame>
  )
}

export function WordsField({
  screen,
}: {
  screen: LipsyncScreen
}): ReactElement {
  return (
    <div data-slot="lipsync-words" className="flex flex-col gap-s3">
      <WordsSwitch screen={screen} />
      {screen.plan.mode === "audio" ? (
        <AudioWords screen={screen} />
      ) : (
        <>
          <TextWords screen={screen} />
          <VoiceRow screen={screen} />
        </>
      )}
    </div>
  )
}
