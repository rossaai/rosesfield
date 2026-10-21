import { routes } from "@rosesfield/contract"
import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { callRoute } from "@/api/call-route"
import { assetQuery } from "@/api/queries"
import type { Device } from "@/device/device.port"
import { useDevice } from "@/device/device-context"
import { type Uploads, useUploads } from "@/pieces/use-uploads"
import { listOf } from "@/screens/app/fields/field-props"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  extraSlotOf,
  type ImageSlot,
  slotMoveOf,
} from "@/studio/edit/edit-form"
import {
  fileFactsOf,
  type PhotoFacts,
  photoFormats,
  photoRefusalOf,
  photoRefusalText,
  sizeOfBlob,
} from "@/studio/edit/photo-check"

export type PhotoReading =
  | { state: "none" }
  | { state: "reading" }
  | { state: "read"; facts: PhotoFacts }

export type EditPhoto = {
  photo: string | null
  extras: string[]
  reading: PhotoReading
  isRefused: boolean
  message: string | null
  isUploading: boolean
  upload: () => void
  addFromLibrary: (ids: readonly string[]) => void
  remove: (assetId: string) => void
}

export async function assetFactsOf(
  client: QueryClient,
  assetId: string
): Promise<PhotoFacts> {
  const { asset } = await client.fetchQuery(assetQuery(assetId))
  if (asset.width !== null && asset.height !== null) {
    return {
      mime: asset.mime,
      bytes: asset.bytes,
      size: { width: asset.width, height: asset.height },
    }
  }
  const blob = await callRoute(routes.readAssetContent, {
    params: { assetId },
  })
  return { mime: asset.mime, bytes: asset.bytes, size: await sizeOfBlob(blob) }
}

function usePhotoReading(photo: string | null): PhotoReading {
  const client = useQueryClient()
  const id = photo ?? ""
  const facts = useQuery({
    queryKey: ["edit", "photo-facts", id],
    queryFn: () => assetFactsOf(client, id),
    enabled: id !== "",
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
  if (id === "") {
    return { state: "none" }
  }
  if (facts.data !== undefined) {
    return { state: "read", facts: facts.data }
  }
  return facts.isError ? { state: "none" } : { state: "reading" }
}

function useSlotKeeper(
  form: AppForm,
  slot: string | null,
  photo: string | null,
  setPhoto: (photo: string | null) => void
): void {
  const held = slot === null ? undefined : form.values.inputs[slot]
  const { setInput } = form
  useEffect(() => {
    if (slot === null) {
      return
    }
    const move = slotMoveOf(photo, held)
    if (move.kind === "adopt") {
      setPhoto(move.photo)
    }
    if (move.kind === "place") {
      setInput(slot, move.ids)
    }
  }, [slot, photo, held, setInput, setPhoto])
}

function extrasOf(form: AppForm, slots: readonly ImageSlot[]): string[] {
  return slots.slice(1).flatMap((slot) => listOf(form.values.inputs[slot.name]))
}

type Held = {
  form: AppForm
  slots: readonly ImageSlot[]
  photo: string | null
}

type PhotoActions = Pick<EditPhoto, "upload" | "addFromLibrary" | "remove">

function placeIn(now: Held, assetId: string): "photo" | "extra" {
  const extra =
    now.photo === null ? null : extraSlotOf(now.slots, now.form.values.inputs)
  if (extra !== null) {
    const held = listOf(now.form.values.inputs[extra])
    now.form.setInput(extra, [...held, assetId])
    return "extra"
  }
  const first = now.slots[0]
  if (first !== undefined) {
    now.form.setInput(first.name, [assetId])
  }
  return "photo"
}

function removeFrom(now: Held, assetId: string): void {
  for (const slot of now.slots) {
    const held = listOf(now.form.values.inputs[slot.name])
    if (held.includes(assetId)) {
      now.form.setInput(
        slot.name,
        held.filter((id) => id !== assetId)
      )
    }
  }
}

async function pickPhoto(
  device: Device,
  uploads: Uploads,
  check: (facts: PhotoFacts) => boolean
): Promise<string | null> {
  const [file] = await device.pickFiles({
    accept: photoFormats,
    multiple: false,
  })
  if (file === undefined || !check(await fileFactsOf(file))) {
    return null
  }
  const [added] = await uploads.start([file])
  return added?.id ?? null
}

function usePhotoActions(
  latest: { current: Held },
  setPhoto: (photo: string | null) => void,
  setNote: (note: string | null) => void
): PhotoActions & { isUploading: boolean } {
  const client = useQueryClient()
  const device = useDevice()
  const uploads = useUploads()
  const take = (assetId: string): void => {
    setNote(null)
    if (placeIn(latest.current, assetId) === "photo") {
      setPhoto(assetId)
    }
  }
  const check = (facts: PhotoFacts): boolean => {
    const found = photoRefusalOf(facts)
    setNote(found === null ? null : photoRefusalText(found))
    return found === null
  }
  return {
    isUploading: uploads.uploads.some((one) => one.status === "uploading"),
    upload: () => {
      void pickPhoto(device, uploads, check).then((added) => {
        if (added !== null) {
          take(added)
        }
      })
    },
    addFromLibrary: ([first]) => {
      if (first !== undefined) {
        void assetFactsOf(client, first)
          .then((facts) => (check(facts) ? take(first) : undefined))
          .catch(() => setNote(null))
      }
    },
    remove: (assetId) => {
      setNote(null)
      if (assetId === latest.current.photo) {
        setPhoto(null)
      }
      removeFrom(latest.current, assetId)
    },
  }
}

export function useEditPhoto(
  form: AppForm,
  slots: readonly ImageSlot[],
  initial: string | null
): EditPhoto {
  const [photo, setPhoto] = useState<string | null>(initial)
  const [note, setNote] = useState<string | null>(null)
  const latest = useRef<Held>({ form, slots, photo })
  latest.current = { form, slots, photo }
  useSlotKeeper(form, slots[0]?.name ?? null, photo, setPhoto)
  const reading = usePhotoReading(photo)
  const actions = usePhotoActions(latest, setPhoto, setNote)
  const refusal =
    reading.state === "read" ? photoRefusalOf(reading.facts) : null
  return {
    ...actions,
    photo,
    extras: extrasOf(form, slots),
    reading,
    isRefused: refusal !== null,
    message: note ?? (refusal === null ? null : photoRefusalText(refusal)),
  }
}
