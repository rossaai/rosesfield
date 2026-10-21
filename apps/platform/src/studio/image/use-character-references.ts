import { useQuery } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { characterQuery } from "@/api/queries"
import type { AppForm } from "@/screens/app/use-app-form"
import type { ReferenceTray } from "@/studio/image/use-reference-tray"

export function useCharacterReferences(
  use: string | undefined,
  form: AppForm,
  tray: ReferenceTray
): void {
  const found = useQuery({
    ...characterQuery(use ?? ""),
    enabled: use !== undefined,
    retry: false,
  })
  const photos = found.data?.character.references
  const { field, addAssets } = tray
  const fieldKey = field === null ? null : `${field.name}:${field.max}`
  const isSeeded = form.source !== "defaults"
  const placedIn = useRef(new Set<string>())
  useEffect(() => {
    if (
      photos === undefined ||
      photos.length === 0 ||
      fieldKey === null ||
      !isSeeded ||
      placedIn.current.has(fieldKey)
    ) {
      return
    }
    placedIn.current.add(fieldKey)
    addAssets(photos)
  }, [photos, fieldKey, isSeeded, addAssets])
}
