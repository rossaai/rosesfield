import { type ReactElement, useState } from "react"
import { tCatalog } from "@/copy/t"
import { DropWell } from "@/pieces/drop-well"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf } from "@/screens/app/fields/field-props"
import type { AppForm } from "@/screens/app/use-app-form"
import type { ImageSlots } from "@/studio/video/video-tabs"

type Slot = { name: string; max: number }

type WellCopy = {
  captionKey: string
  noteKey: string
  isOptional: boolean
}

function Well({
  slot,
  copy,
  form,
}: {
  slot: Slot
  copy: WellCopy
  form: AppForm
}): ReactElement {
  const [message, setMessage] = useState<string | null>(null)
  return (
    <FieldFrame
      caption={tCatalog(copy.captionKey)}
      isOptional={copy.isOptional}
      note={tCatalog(copy.noteKey, { max: slot.max })}
      problem={form.problems.get(slot.name)}
      message={message}
    >
      <DropWell
        kind="image"
        ids={listOf(form.values.inputs[slot.name])}
        max={slot.max}
        onChange={(ids) => form.setInput(slot.name, ids)}
        onMessage={setMessage}
      />
    </FieldFrame>
  )
}

export function VideoWells({
  slots,
  form,
}: {
  slots: ImageSlots
  form: AppForm
}): ReactElement {
  const { start, references, last } = slots
  if (start === null && references === null && last === null) {
    return (
      <p className="text-label text-ink-muted">{tCatalog("video.well.none")}</p>
    )
  }
  const isPair = start !== null && last !== null
  return (
    <div className="flex flex-col gap-s4">
      {start === null ? null : (
        <Well
          slot={start}
          form={form}
          copy={{
            captionKey: isPair ? "video.well.first" : "video.well.start",
            noteKey: isPair ? "video.well.first.note" : "video.well.start.note",
            isOptional: !isPair,
          }}
        />
      )}
      {references === null ? null : (
        <Well
          slot={references}
          form={form}
          copy={{
            captionKey: "video.well.references",
            noteKey: "video.well.references.note",
            isOptional: false,
          }}
        />
      )}
      {last === null ? null : (
        <Well
          slot={last}
          form={form}
          copy={{
            captionKey: "video.well.last",
            noteKey: "video.well.last.note",
            isOptional: false,
          }}
        />
      )}
    </div>
  )
}
