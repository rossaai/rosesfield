import { type AppListing, routes } from "@rosesfield/contract"
import type { QueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { callRoute } from "@/api/call-route"
import { assetQuery } from "@/api/queries"
import { formatBytes } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { listOf } from "@/screens/app/fields/field-props"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  type PhotoCheck,
  usePhotoChecks,
} from "@/studio/effects/use-photo-checks"
import {
  nearestRatioOf,
  type PhotoProblem,
  type PhotoSize,
  photoProblemOf,
} from "@/studio/relight/relight-photo"

export const photoInput = "image"

export type RelightPhoto = {
  photoSize: PhotoSize | null
  message: string | null
  onMessage: (message: string | null) => void
  isReady: boolean
}

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

export function refusalOf(problem: PhotoProblem): string {
  switch (problem.kind) {
    case "wrongKind":
      return t("field.asset.wrongKind", {
        kinds: tCatalog("relight.input.image.kinds"),
      })
    case "tooLarge":
      return t("field.asset.tooLarge", {
        size: formatBytes(problem.bytes),
        limit: formatBytes(problem.limit),
      })
    case "tooSmall":
      return tCatalog("relight.input.image.tooSmall", {
        width: problem.width,
        height: problem.height,
        min: problem.min,
      })
    case "ratio":
      return tCatalog("relight.input.image.ratio", {
        width: problem.width,
        height: problem.height,
      })
  }
}

export async function checkRelightPhoto(
  client: QueryClient,
  assetId: string
): Promise<PhotoCheck> {
  const { asset } = await client.fetchQuery(assetQuery(assetId))
  const stored =
    asset.width === null || asset.height === null
      ? null
      : { width: asset.width, height: asset.height }
  const size = stored ?? (await measure(assetId))
  const problem = photoProblemOf({ mime: asset.mime, bytes: asset.bytes, size })
  if (problem !== null || size === null) {
    return { refusal: refusalOf(problem ?? { kind: "wrongKind" }) }
  }
  return { size }
}

function ratiosOf(app: AppListing): readonly string[] {
  return app.output.kind === "image" ? app.output.aspectRatios.options : []
}

export function useRelightPhoto(app: AppListing, form: AppForm): RelightPhoto {
  const photos = usePhotoChecks(form, photoInput, checkRelightPhoto)
  const photoId = listOf(form.values.inputs[photoInput])[0]
  const photoSize =
    photoId === undefined ? null : (photos.sizeOf(photoId) ?? null)
  const target =
    photoSize === null ? null : nearestRatioOf(ratiosOf(app), photoSize)
  const current = form.values.aspectRatio
  const { setForm } = form
  useEffect(() => {
    if (target !== null && target !== current) {
      setForm({ aspectRatio: target })
    }
  }, [target, current, setForm])
  return {
    photoSize,
    message: photos.message,
    onMessage: photos.setMessage,
    isReady: photos.isClear && (target === null || target === current),
  }
}
