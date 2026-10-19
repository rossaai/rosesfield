import { type AppListing, type ImageAccept, routes } from "@rosesfield/contract"
import {
  isCancelledError,
  type QueryClient,
  useQueryClient,
} from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import { callRoute } from "@/api/call-route"
import { assetQuery } from "@/api/queries"
import { formatBytes } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { listOf } from "@/screens/app/fields/field-props"
import type { AppForm } from "@/screens/app/use-app-form"

export type PhotoSize = { width: number; height: number }

export type PhotoCheck = { size: PhotoSize } | { refusal: string }

export type CheckPhoto = (
  client: QueryClient,
  assetId: string
) => Promise<PhotoCheck>

export type PhotoChecks = {
  message: string | null
  setMessage: (message: string | null) => void
  sizeOf: (assetId: string) => PhotoSize | undefined
  isClear: boolean
}

type Checked = { size: PhotoSize } | { refusal: string; again: boolean }

const maxCancelledChecks = 3

async function measure(assetId: string): Promise<PhotoSize | null> {
  const blob = await callRoute(routes.readAssetContent, {
    params: { assetId },
  })
  try {
    const bitmap = await createImageBitmap(blob)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return null
  }
}

export function acceptOf(app: AppListing, name: string): ImageAccept | null {
  const input = app.inputs.find((one) => one.name === name)
  return input?.type === "image" ? (input.accept ?? null) : null
}

export function photoCheckOf(accept: ImageAccept | null): CheckPhoto {
  return async (client, assetId) => {
    const { asset } = await client.fetchQuery(assetQuery(assetId))
    const wrongFormat = {
      refusal: tCatalog("effects.input.image.wrongFormat"),
    }
    const formats: readonly string[] = accept?.formats ?? []
    if (accept !== null && !formats.includes(asset.mime)) {
      return wrongFormat
    }
    if (accept !== null && asset.bytes > accept.maxBytes) {
      return {
        refusal: t("field.asset.tooLarge", {
          size: formatBytes(asset.bytes),
          limit: formatBytes(accept.maxBytes),
        }),
      }
    }
    const size = await measure(assetId)
    if (size === null) {
      return wrongFormat
    }
    const side = Math.min(size.width, size.height)
    if (accept !== null && side < accept.minShortSide) {
      return {
        refusal: tCatalog("effects.input.image.tooSmall", {
          side,
          min: accept.minShortSide,
        }),
      }
    }
    return { size }
  }
}

async function settle(
  check: CheckPhoto,
  client: QueryClient,
  assetId: string,
  tries = 1
): Promise<Checked> {
  try {
    const found = await check(client, assetId)
    return "size" in found ? found : { refusal: found.refusal, again: false }
  } catch (error) {
    if (isCancelledError(error) && tries < maxCancelledChecks) {
      return settle(check, client, assetId, tries + 1)
    }
    return { refusal: tCatalog("effects.input.image.unread"), again: true }
  }
}

function refusedIn(
  ids: readonly string[],
  results: ReadonlyMap<string, Checked>
): { id: string; refusal: string; again: boolean }[] {
  return ids.flatMap((id) => {
    const found = results.get(id)
    return found !== undefined && "refusal" in found ? [{ id, ...found }] : []
  })
}

export function usePhotoChecks(
  form: AppForm,
  name: string,
  check: CheckPhoto
): PhotoChecks {
  const client = useQueryClient()
  const [results, setResults] = useState<ReadonlyMap<string, Checked>>(
    new Map()
  )
  const [message, setMessage] = useState<string | null>(null)
  const started = useRef(new Set<string>())
  const ids = listOf(form.values.inputs[name])
  const { setInput } = form
  useEffect(() => {
    for (const id of ids) {
      if (started.current.has(id)) {
        continue
      }
      started.current.add(id)
      void settle(check, client, id).then((found) => {
        if ("size" in found) {
          setMessage(null)
        }
        setResults((known) => new Map(known).set(id, found))
      })
    }
  }, [client, ids, check])
  useEffect(() => {
    const refused = refusedIn(ids, results)
    const [first] = refused
    if (first === undefined) {
      return
    }
    setMessage(first.refusal)
    const refusedIds = new Set(refused.map((found) => found.id))
    setInput(
      name,
      ids.filter((id) => !refusedIds.has(id))
    )
    const again = refused.filter((found) => found.again)
    if (again.length > 0) {
      for (const found of again) {
        started.current.delete(found.id)
      }
      setResults((known) => {
        const next = new Map(known)
        for (const found of again) {
          next.delete(found.id)
        }
        return next
      })
    }
  }, [ids, results, name, setInput])
  const sizeOf = useCallback(
    (assetId: string) => {
      const found = results.get(assetId)
      return found !== undefined && "size" in found ? found.size : undefined
    },
    [results]
  )
  return {
    message,
    setMessage,
    sizeOf,
    isClear: ids.every((id) => sizeOf(id) !== undefined),
  }
}
