import { useCallback, useState } from "react"
import { useDevice } from "@/device/device-context"
import { useUploads } from "@/pieces/use-uploads"
import type { Draft } from "@/router-context"

export type DraftState = {
  draft: Draft
  isUploading: boolean
  setPrompt: (prompt: string) => void
  addAssets: (assetIds: readonly string[]) => void
  removeAttachment: (id: string) => void
  addCharacter: (characterId: string) => void
  upload: () => Promise<void>
  clear: () => void
}

const acceptAll: readonly string[] = ["image/*", "video/*", "audio/*"]

function unique(list: readonly string[]): string[] {
  return [...new Set(list)]
}

export function emptyDraft(): Draft {
  return { prompt: "", assetIds: [], characterIds: [] }
}

export function useDraft(initial?: Draft): DraftState {
  const [draft, setDraft] = useState<Draft>(initial ?? emptyDraft())
  const uploads = useUploads()
  const device = useDevice()
  const addAssets = useCallback((assetIds: readonly string[]) => {
    setDraft((current) => ({
      ...current,
      assetIds: unique([...current.assetIds, ...assetIds]),
    }))
  }, [])
  const upload = useCallback(async () => {
    const files = await device.pickFiles({ accept: acceptAll, multiple: true })
    const assets = await uploads.start(files)
    addAssets(assets.map((asset) => asset.id))
  }, [device, uploads, addAssets])
  return {
    draft,
    isUploading: uploads.uploads.some((one) => one.status === "uploading"),
    setPrompt: (prompt) => setDraft((current) => ({ ...current, prompt })),
    addAssets,
    removeAttachment: (id) =>
      setDraft((current) => ({
        ...current,
        assetIds: current.assetIds.filter((one) => one !== id),
        characterIds: current.characterIds.filter((one) => one !== id),
      })),
    addCharacter: (characterId) =>
      setDraft((current) => ({
        ...current,
        characterIds: unique([...current.characterIds, characterId]),
      })),
    upload,
    clear: () => setDraft(emptyDraft()),
  }
}
