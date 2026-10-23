import type { ModelField } from "@rosesfield/catalog/comfy"
import type {
  PromptAttachment,
  PromptSlot,
} from "@rosesfield/ui/components/prompt-bar"
import { useRef, useState } from "react"
import { t } from "@/copy/t"
import { useDevice } from "@/device/device-context"
import { useAssetThumbs } from "@/pieces/attachment-thumbs"
import { useUploads } from "@/pieces/use-uploads"
import { listOf } from "@/screens/app/fields/field-props"
import { fieldCaption } from "@/screens/app/hosted/field-words"
import type { AppForm } from "@/screens/app/use-app-form"
import { roomFor } from "@/studio/image/image-fields"

type MediaField = Extract<ModelField, { kind: "media" }>

export type ReferenceSwitch = {
  field: MediaField
  choose: () => void
}

export type ReferenceTray = {
  field: MediaField | null
  target: MediaField | null
  attachments: PromptAttachment[]
  slots: PromptSlot[] | undefined
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

function slotsOf(
  field: MediaField | null,
  attachments: readonly PromptAttachment[],
  room: number,
  upload: () => void
): PromptSlot[] | undefined {
  if (field === null || (attachments.length === 0 && field.min === 0)) {
    return undefined
  }
  return [
    {
      id: field.name,
      label: fieldCaption(field),
      ...(field.min === 0 ? { note: t("field.optional") } : {}),
      items: attachments.map(({ id, src, alt }) => ({ id, src, alt })),
      addLabel: t(`field.asset.add.${field.media}`),
      onAdd: room > 0 ? upload : undefined,
    },
  ]
}

function useTrayNote(field: MediaField | null): {
  message: string | null
  say: (text: string | null) => void
} {
  const fieldKey = field === null ? "" : `${field.name}:${field.max}`
  const [note, setNote] = useState<Note | null>(null)
  if (note !== null && note.fieldKey !== fieldKey) {
    setNote(null)
  }
  return {
    message: note?.fieldKey === fieldKey ? note.text : null,
    say: (text) => setNote(text === null ? null : { fieldKey, text }),
  }
}

export function useReferenceTray(
  field: MediaField | null,
  form: AppForm,
  fallback: ReferenceSwitch | null = null
): ReferenceTray {
  const uploads = useUploads()
  const device = useDevice()
  const { message, say } = useTrayNote(field)
  const held = field === null ? [] : listOf(form.values.inputs[field.name])
  const latest = useRef(held)
  latest.current = held
  const caption = field === null ? undefined : fieldCaption(field)
  const attachments = useAssetThumbs(held, () => caption)
  const target = field ?? fallback?.field ?? null
  const place = (ids: readonly string[], refusedBefore: number): void => {
    if (target === null || ids.length === 0) {
      return
    }
    if (field === null) {
      fallback?.choose()
    }
    const kept = keptReferences(latest.current, ids, target.max)
    form.setInput(target.name, kept.ids)
    say(tooMany(refusedBefore + kept.refused, target.max))
  }
  const room = target === null ? 0 : roomFor(target, held.length)
  const upload = (): void => {
    if (target === null) {
      return
    }
    void device
      .pickFiles({ accept: ["image/*"], multiple: target.max > 1 })
      .then(async (files) => {
        const space = roomFor(target, latest.current.length)
        const added = await uploads.start(files.slice(0, space))
        place(
          added.map((asset) => asset.id),
          Math.max(0, files.length - space)
        )
      })
  }
  return {
    field,
    target,
    attachments: field === null ? [] : attachments,
    slots: slotsOf(field, attachments, room, upload),
    room,
    message,
    isUploading: uploads.uploads.some((one) => one.status === "uploading"),
    upload,
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
