import { routes } from "@rosesfield/contract"
import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { type RefObject, useEffect, useState } from "react"
import { callRoute } from "@/api/call-route"
import { makePreview } from "@/api/make-preview"
import { assetPreviewKey, previewQuery } from "@/api/use-asset-source"
import type { MeshScene } from "@/studio/three-d/glb"
import { meshQuery } from "@/studio/three-d/mesh-file"
import { MeshRenderer } from "@/studio/three-d/mesh-renderer"
import { cameraOf, startOrbit } from "@/studio/three-d/orbit"

class StillLine {
  static readonly size = 384
  static readonly type = "image/webp"
  static readonly quality = 0.9

  #last: Promise<unknown> = Promise.resolve()

  paint(scene: MeshScene): Promise<string | null> {
    const next = this.#last.then(
      () => paintStill(scene),
      () => paintStill(scene)
    )
    this.#last = next.catch(() => null)
    return next
  }
}

const stillLine = new StillLine()
const keptStills = new Set<string>()

async function keepStill(
  client: QueryClient,
  assetId: string,
  still: string
): Promise<void> {
  if (keptStills.has(assetId)) {
    return
  }
  keptStills.add(assetId)
  const stored = await client.fetchQuery(previewQuery(assetId))
  if (stored !== null) {
    return
  }
  const made = await makePreview(still, "image")
  if (made === null) {
    return
  }
  await callRoute(routes.putAssetPreview, { params: { assetId }, body: made })
  client.setQueryData(assetPreviewKey(assetId), URL.createObjectURL(made))
}

export async function paintStill(scene: MeshScene): Promise<string | null> {
  const size = StillLine.size
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const renderer = MeshRenderer.of(canvas)
  if (renderer === null) {
    return null
  }
  try {
    await renderer.load(scene, () => undefined)
    const camera = cameraOf(startOrbit, scene.center, scene.radius, 1)
    renderer.draw(camera, size, size)
    const still = canvas.toDataURL(StillLine.type, StillLine.quality)
    return still.startsWith("data:image/") ? still : null
  } finally {
    renderer.release()
  }
}

export function meshStillKey(assetId: string): readonly string[] {
  return ["mesh-still", assetId]
}

export function useMeshStill(assetId: string, isSeen: boolean): string | null {
  const client = useQueryClient()
  const still = useQuery({
    queryKey: meshStillKey(assetId),
    queryFn: async (): Promise<string | null> => {
      const file = await client.fetchQuery(meshQuery(assetId))
      const still =
        file.scene === null ? null : await stillLine.paint(file.scene)
      if (still !== null) {
        void keepStill(client, assetId, still).catch(() => undefined)
      }
      return still
    },
    enabled: isSeen,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
  return still.data ?? null
}

export function useSeen(
  ref: RefObject<HTMLElement | null>,
  isWatched: boolean
): boolean {
  const [isSeen, setIsSeen] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!isWatched || isSeen || element === null) {
      return
    }
    if (typeof IntersectionObserver === "undefined") {
      setIsSeen(true)
      return
    }
    const watch = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setIsSeen(true)
      }
    })
    watch.observe(element)
    return () => watch.disconnect()
  }, [ref, isWatched, isSeen])
  return isSeen
}
