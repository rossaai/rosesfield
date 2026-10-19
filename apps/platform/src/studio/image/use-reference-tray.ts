import type { ModelField } from "@rosesfield/catalog/comfy"
import type { PromptAttachment } from "@rosesfield/ui/components/prompt-bar"
import { useState } from "react"
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

export function useReferenceTray(
  field: MediaField | null,
  form: AppForm
): ReferenceTray {
  const uploads = useUploads()
  const device = useDevice()
  const [message, setMessage] = useState<string | null>(null)
  const held = field === null ? [] : listOf(form.values.inputs[field.name])
  const caption = field === null ? undefined : fieldCaption(field)
  const attachments = useAssetThumbs(held, () => caption)
  const tell = (refused: number, max: number): void => {
    setMessage(refused > 0 ? t("field.asset.tooMany", { max }) : null)
  }
  const addAssets = (ids: readonly string[]): void => {
    if (field === null) {
      return
    }
    const kept = keptReferences(held, ids, field.max)
    form.setInput(field.name, kept.ids)
    tell(kept.refused, field.max)
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
        .then((files) => {
          const room = roomFor(field, held.length)
          tell(Math.max(0, files.length - room), field.max)
          return uploads.start(files.slice(0, room))
        })
        .then((added) => {
          const kept = keptReferences(
            held,
            added.map((asset) => asset.id),
            field.max
          )
          form.setInput(field.name, kept.ids)
        })
    },
    addAssets,
    remove: (id) => {
      if (field !== null) {
        form.setInput(
          field.name,
          held.filter((one) => one !== id)
        )
        setMessage(null)
      }
    },
  }
}
