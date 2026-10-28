import { type Asset, asset } from "@rosesfield/contract"
import { ToastProvider } from "@rosesfield/ui/components/toast"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import { act } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { assetQuery } from "@/api/queries"
import { AssetTile } from "@/pieces/asset-tile"
import type { FileReading } from "@/studio/upscale/upscale-limits"
import { scaleCheckOf, sizeOf } from "@/studio/upscale/upscale-limits"
import { useFileFacts } from "@/studio/upscale/use-file-facts"

const assetId = "d6a38eac-814b-4009-80ab-c3643ae42a61"

const seen: { reading: FileReading } = { reading: { state: "none" } }
const measured: HTMLImageElement[] = []

class MeasuredImage extends window.Image {
  constructor() {
    super()
    measured.push(this)
  }
}

function UpscaleProbe() {
  seen.reading = useFileFacts(assetId, "image")
  return null
}

function photoOf(): Asset {
  return asset.parse({
    id: assetId,
    kind: "image",
    mime: "image/webp",
    bytes: 85_902,
    width: null,
    height: null,
    durationSeconds: null,
    sourceRunId: null,
    createdAt: "2026-10-22T09:00:03.000Z",
  })
}

function renderPhoto(previewStatus: 200 | 404): QueryClient {
  vi.stubGlobal("Image", MeasuredImage)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(assetQuery(assetId).queryKey, { asset: photoOf() })
  vi.stubGlobal("fetch", (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : input.toString()
    if (url.includes(`/api/assets/${assetId}/preview`)) {
      return Promise.resolve(
        previewStatus === 200
          ? new Response(new Uint8Array(100), {
              status: 200,
              headers: { "Content-Type": "image/webp" },
            })
          : new Response(null, { status: 404 })
      )
    }
    return new Promise(() => undefined)
  })
  URL.createObjectURL = vi.fn(
    () => "blob:preview-320"
  ) as typeof URL.createObjectURL
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <ToastProvider>
          <TooltipProvider>
            <AssetTile assetId={assetId} />
            <UpscaleProbe />
          </TooltipProvider>
        </ToastProvider>
      ),
    }),
    history: createMemoryHistory({ initialEntries: ["/library"] }),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return client
}

async function pictureFrom(src: string): Promise<HTMLImageElement> {
  return waitFor(() => {
    const found = document.querySelector<HTMLImageElement>(`img[src="${src}"]`)
    if (found === null) {
      throw new Error(`no picture from ${src}`)
    }
    return found
  })
}

function loadAt(picture: HTMLImageElement, width: number, height: number) {
  Object.defineProperty(picture, "naturalWidth", { value: width })
  Object.defineProperty(picture, "naturalHeight", { value: height })
  fireEvent.load(picture)
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(URL, "createObjectURL")
  measured.length = 0
  seen.reading = { state: "none" }
})

async function measureFull(width: number, height: number) {
  const image = await waitFor(() => {
    const found = measured.at(-1)
    if (found === undefined) {
      throw new Error("the Upscale app measured nothing")
    }
    return found
  })
  Object.defineProperty(image, "naturalWidth", { value: width })
  Object.defineProperty(image, "naturalHeight", { value: height })
  act(() => {
    image.onload?.(new Event("load"))
  })
}

function upscaleSize() {
  const reading = seen.reading
  return scaleCheckOf(
    sizeOf(reading.state === "read" ? reading.facts : null),
    2,
    null
  )
}

describe("the size the Upscale app reads for a photo with no stored size", () => {
  it("keeps the photo's size unknown when its tile draws the 320 px preview, so Upscale measures the 1024 px photo", async () => {
    const client = renderPhoto(200)
    const picture = await pictureFrom("blob:preview-320")
    loadAt(picture, 320, 320)
    expect(client.getQueryData(assetQuery(assetId).queryKey)).toMatchObject({
      asset: { width: null, height: null },
    })
    await measureFull(1024, 1024)
    expect(upscaleSize()).toEqual({ state: "fits", width: 2048, height: 2048 })
  })

  it("records the photo's size when its tile draws the full picture", async () => {
    const client = renderPhoto(404)
    const picture = await pictureFrom(`/api/assets/${assetId}/content`)
    loadAt(picture, 1024, 1024)
    expect(client.getQueryData(assetQuery(assetId).queryKey)).toMatchObject({
      asset: { width: 1024, height: 1024 },
    })
    await waitFor(() =>
      expect(upscaleSize()).toEqual({
        state: "fits",
        width: 2048,
        height: 2048,
      })
    )
  })
})
