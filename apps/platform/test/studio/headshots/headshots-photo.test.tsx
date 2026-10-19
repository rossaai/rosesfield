import { type Asset, asset } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { type ReactNode, useCallback, useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { assetQuery } from "@/api/queries"
import type { FieldValue, FormValues } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"
import type { StartRun } from "@/screens/app/use-start-run"
import { useCheckedStart } from "@/studio/effects/use-checked-start"
import {
  type CheckPhoto,
  usePhotoChecks,
} from "@/studio/effects/use-photo-checks"
import {
  checkHeadshotPhoto,
  photoRefusalOf,
} from "@/studio/headshots/photo-check"
import { assetIds } from "../../sample-app"

const photoId = assetIds[0] ?? ""

const download = vi.hoisted(() => ({ count: 0 }))

vi.mock("@/api/call-route", () => ({
  callRoute: async () => {
    download.count += 1
    return new Blob([new Uint8Array(8)], { type: "image/png" })
  },
}))

function photo(
  width: number | null,
  height: number | null,
  mime = "image/png",
  bytes = 2_000_000
): Asset {
  return asset.parse({
    id: photoId,
    kind: "image",
    mime,
    bytes,
    width,
    height,
    durationSeconds: null,
    sourceRunId: null,
    createdAt: "2026-10-18T09:00:00.000Z",
  })
}

function useScreen(check: CheckPhoto, generate: () => void) {
  const [values, setValues] = useState<FormValues>({
    inputs: { image: [photoId] },
    seedMode: "random",
    count: 2,
    aspectRatio: "1:1",
  })
  const setInput = useCallback((name: string, value: FieldValue) => {
    setValues((current) => ({
      ...current,
      inputs: { ...current.inputs, [name]: value },
    }))
  }, [])
  const setForm = useCallback((change: Partial<FormValues>) => {
    setValues((current) => ({ ...current, ...change }))
  }, [])
  const image = values.inputs.image
  const form: AppForm = {
    values,
    problems: new Map(),
    setInput,
    setForm,
    fill: () => undefined,
    validate: () => Array.isArray(image) && image.length > 0,
    register: () => undefined,
  }
  const photos = usePhotoChecks(form, "image", check)
  const start: StartRun = { generate, isPending: false, error: null, price: "" }
  const checked = useCheckedStart(start, form, photos.isClear, () => undefined)
  return { values, photos, checked }
}

function renderScreen(stored: Asset, check: CheckPhoto = checkHeadshotPhoto) {
  const client = new QueryClient()
  client.setQueryData(assetQuery(photoId).queryKey, { asset: stored })
  const generate = vi.fn()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const rendered = renderHook(() => useScreen(check, generate), { wrapper })
  return { ...rendered, generate }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  download.count = 0
})

describe("the Headshots photo limits", () => {
  it("writes the app's message for a photo of 300 by 400 pixels", () => {
    expect(
      photoRefusalOf({
        mime: "image/png",
        bytes: 400_000,
        size: { width: 300, height: 400 },
      })
    ).toBe(
      "This photo is 300 by 400 pixels. The short side needs 512 pixels or more."
    )
  })

  it("takes 9:16 and 16:9 and refuses a photo past them", () => {
    const refusal = (width: number, height: number) =>
      photoRefusalOf({ mime: "image/png", bytes: 1, size: { width, height } })
    expect(refusal(1080, 1920)).toBeNull()
    expect(refusal(1920, 1080)).toBeNull()
    expect(refusal(600, 2000)).toBe(
      "This photo is 600 by 2,000 pixels. Pick a photo between 9:16 and 16:9."
    )
    expect(refusal(2000, 600)).not.toBeNull()
  })

  it("refuses a GIF and a file past 20 MB before it reads the size", () => {
    const refusal = (mime: string, bytes: number) =>
      photoRefusalOf({ mime, bytes, size: { width: 1200, height: 1600 } })
    expect(refusal("image/gif", 1)).not.toBeNull()
    expect(refusal("image/jpeg", 20_000_001)).not.toBeNull()
    expect(refusal("image/webp", 20_000_000)).toBeNull()
  })
})

describe("the Headshots Generate press with the photo check", () => {
  it("refuses a photo of 300 by 400 pixels placed in the form, removes it and starts no run", async () => {
    const { result, generate } = renderScreen(photo(300, 400))
    await waitFor(() => expect(result.current.photos.message).not.toBeNull())
    expect(result.current.photos.message).toContain("300 by 400")
    expect(result.current.values.inputs.image).toEqual([])
    act(() => result.current.checked.generate())
    expect(generate).not.toHaveBeenCalled()
  })

  it("refuses a photo of 600 by 2,000 pixels and starts no run", async () => {
    const { result, generate } = renderScreen(photo(600, 2000))
    await waitFor(() => expect(result.current.photos.message).not.toBeNull())
    act(() => result.current.checked.generate())
    expect(generate).not.toHaveBeenCalled()
  })

  it("waits for a photo of 1200 by 1600 pixels to pass, then starts one run", async () => {
    const { result, generate } = renderScreen(photo(1200, 1600))
    act(() => result.current.checked.generate())
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(1))
    expect(result.current.photos.message).toBeNull()
    expect(download.count).toBe(0)
  })

  it("measures a photo the library holds no size for", async () => {
    vi.stubGlobal("createImageBitmap", async () => ({
      width: 300,
      height: 400,
      close: () => undefined,
    }))
    const { result, generate } = renderScreen(photo(null, null))
    await waitFor(() => expect(result.current.photos.message).not.toBeNull())
    expect(download.count).toBe(1)
    act(() => result.current.checked.generate())
    expect(generate).not.toHaveBeenCalled()
  })

  it("starts a run for the photo of 300 by 400 pixels with a planted check that refuses nothing, the control", async () => {
    const planted: CheckPhoto = async () => ({
      size: { width: 300, height: 400 },
    })
    const { result, generate } = renderScreen(photo(300, 400), planted)
    act(() => result.current.checked.generate())
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(1))
    expect(result.current.values.inputs.image).toEqual([photoId])
  })
})
