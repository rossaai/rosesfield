import { speechModelInput } from "@rosesfield/catalog/lipsync"
import { IconButton } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { Textarea } from "@rosesfield/ui/components/textarea"
import { XIcon } from "lucide-react"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { useAssetSource } from "@/api/use-asset-source"
import { t, tCatalog } from "@/copy/t"
import { useAssetNameOf } from "@/pieces/asset-name"
import { AudioRow } from "@/pieces/audio-row"
import { DropWell, type WellAction } from "@/pieces/drop-well"
import { ChoiceField } from "@/screens/app/fields/choice-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf, textOf } from "@/screens/app/fields/field-props"
import { modelNameOf } from "@/screens/app/hosted/catalog-picker"
import { wordsLabelKey } from "@/studio/lipsync/lipsync-words"
import type { LipsyncScreen } from "@/studio/lipsync/use-lipsync-screen"

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

function typeAction(screen: LipsyncScreen): WellAction[] {
  return screen.modes.includes("text")
    ? [{ label: t("kind.text"), onSelect: () => screen.setWords("text") }]
    : []
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
      caption={tCatalog(wordsLabelKey)}
      isOptional={false}
      note={null}
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
          limits={limitNote(screen) ?? undefined}
          actions={typeAction(screen)}
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
      caption={tCatalog(wordsLabelKey)}
      isOptional={false}
      note={null}
      problem={problem}
    >
      <div className="flex items-start gap-s2">
        <Textarea
          ref={box}
          className="min-w-0 flex-1"
          aria-label={label}
          aria-invalid={problem === undefined ? undefined : true}
          placeholder={tCatalog("voice.input.script.placeholder")}
          value={textOf(form.values.inputs[name])}
          onChange={(event) => form.setInput(name, event.target.value)}
        />
        {screen.modes.includes("audio") ? (
          <IconButton
            label={t("field.asset.remove")}
            tone="quiet"
            onClick={() => screen.setWords("audio")}
          >
            <XIcon aria-hidden="true" />
          </IconButton>
        ) : null}
      </div>
    </FieldFrame>
  )
}

function VoiceRow({ screen }: { screen: LipsyncScreen }): ReactElement | null {
  const { voices } = screen
  if (!screen.plan.isChain || voices.models.length === 0) {
    return null
  }
  return (
    <div data-slot="lipsync-voice">
      <ChoiceField
        label={tCatalog("voice.input.mode.label")}
        items={voices.models.map((model) => ({
          value: model.id,
          label: modelNameOf(model),
        }))}
        value={voices.chosen?.id ?? ""}
        onChange={voices.choose}
        note={null}
        problem={screen.form.problems.get(speechModelInput)}
      />
    </div>
  )
}

export function WordsField({
  screen,
}: {
  screen: LipsyncScreen
}): ReactElement {
  return (
    <div data-slot="lipsync-words" className="flex flex-col gap-s3">
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
