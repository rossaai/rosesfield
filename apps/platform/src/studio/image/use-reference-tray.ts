import type { ModelField } from "@rosesfield/catalog/comfy"
import type { PromptAttachment } from "@rosesfield/ui/components/prompt-bar"
import { useRef, useState } from "react"
import { t } from "@/copy/t"
import { useDevice } from "@/device/device-context"
import { useAssetThumbs } from "@/pieces/attachment-thumbs"
import { useUploads } from "@/pieces/use-uploads"
import { listOf } from "@/screens/app/fields/field-props"
import { fieldCaption } from "@/screens/app/hosted/hosted-fields"
import type { AppForm } from "@/screens/app/use-app-form"
import { roomFor } from "@/studio/image/image-fields"

type MediaField = Extract<ModelField, { kind: "media" }>

export type ReferenceTray = {
  field: MediaField | null
  attachments: PromptAttachment[]
  room: number
  message: string | null
  isUploading: boolean
  upload: () => void
  addAssets: (ids: readonly string[]) => void
  remove: (id: string) => void
}

export function keptReferences(
  held: readonly string[],
  added: readonly string[],
  max: number
): { ids: string[]; refused: number } {
  const fresh = added.filter((id) => !held.includes(id))
  const room = Math.max(0, max - held.length)
  return {
    ids: [...held, ...fresh.slice(0, room)],
    refused: Math.max(0, fresh.length - room),
  }
}

type Note = {
  fieldKey: string
  text: string
}

function tooMany(refused: number, max: number): string | null {
  return refused > 0 ? t("field.asset.tooMany", { max }) : null
}

export function useReferenceTray(
  field: MediaField | null,
  form: AppForm
): ReferenceTray {
  const uploads = useUploads()
  const device = useDevice()
  const fieldKey = field === null ? "" : `${field.name}:${field.max}`
  const [note, setNote] = useState<Note | null>(null)
  if (note !== null && note.fieldKey !== fieldKey) {
    setNote(null)
  }
  const message = note?.fieldKey === fieldKey ? note.text : null
  const say = (text: string | null): void =>
    setNote(text === null ? null : { fieldKey, text })
  const held = field === null ? [] : listOf(form.values.inputs[field.name])
  const latest = useRef(held)
  latest.current = held
  const caption = field === null ? undefined : fieldCaption(field)
  const attachments = useAssetThumbs(held, () => caption)
  const place = (ids: readonly string[], refusedBefore: number): void => {
    if (field === null) {
      return
    }
    const kept = keptReferences(latest.current, ids, field.max)
    form.setInput(field.name, kept.ids)
    say(tooMany(refusedBefore + kept.refused, field.max))
  }
  return {
    field,
    attachments: field === null ? [] : attachments,
    room: field === null ? 0 : roomFor(field, held.length),
    message,
    isUploading: uploads.uploads.some((one) => one.status === "uploading"),
    upload: () => {
      if (field === null) {
        return
      }
      void device
        .pickFiles({ accept: ["image/*"], multiple: field.max > 1 })
        .then(async (files) => {
          const room = roomFor(field, latest.current.length)
          const added = await uploads.start(files.slice(0, room))
          place(
            added.map((asset) => asset.id),
            Math.max(0, files.length - room)
          )
        })
    },
    addAssets: (ids) => place(ids, 0),
    remove: (id) => {
      if (field !== null) {
        form.setInput(
          field.name,
          latest.current.filter((one) => one !== id)
        )
        say(null)
      }
    },
  }
}
