import { type Asset, appListing, asset } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { assetQuery } from "@/api/queries"
import type { FieldValue, FormValues } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"
import { useExpandScreen } from "@/studio/expand/use-expand-screen"
import { app } from "../../../../../packages/catalog/src/expand/app"

const listing = appListing.parse(app)
const photoId = "3c4d5e6f-7a8b-4c9d-8e0f-2a3b4c5d6e7f"

const pending = vi.hoisted(() => ({
  inputs: {} as Record<string, FieldValue>,
}))

const run = vi.hoisted(() => ({ generate: vi.fn() }))

vi.mock("@/screens/app/use-start-run", () => ({
  useStartRun: () => ({
    generate: run.generate,
    isPending: false,
    error: null,
    price: "",
  }),
}))

vi.mock("@/screens/app/app-canvas", () => ({
  useAppRuns: () => ({ runs: [], isPending: false }),
}))

vi.mock("@/screens/app/use-app-form", async () => {
  const react = await import("react")
  const appForm = await import("@/screens/app/app-form")
  return {
    useAppForm: (listed: typeof listing): AppForm => {
      const [values, setValues] = react.useState<FormValues>(() => {
        const first = appForm.defaultsOf(listed)
        return {
          ...first,
          inputs: { ...first.inputs, ...pending.inputs },
        }
      })
      const setInput = react.useCallback(
        (name: string, value: FieldValue) =>
          setValues((current) => ({
            ...current,
            inputs: { ...current.inputs, [name]: value },
          })),
        []
      )
      const setForm = react.useCallback(
        (change: Partial<FormValues>) =>
          setValues((current) => ({ ...current, ...change })),
        []
      )
      return {
        values,
        problems: new Map(),
        setInput,
        setForm,
        fill: () => undefined,
        validate: () => true,
        register: () => undefined,
      }
    },
  }
})

type Decode = { load: (image: FakeImage) => void }

class FakeImage {
  static decode: Decode = { load: () => undefined }
  static last: FakeImage | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  naturalWidth = 0
  naturalHeight = 0
  set src(_value: string) {
    FakeImage.last = this
    FakeImage.decode.load(this)
  }
  removeAttribute = (): undefined => undefined
}

function stored(width: number | null, height: number | null): Asset {
  return asset.parse({
    id: photoId,
    kind: "image",
    mime: "image/png",
    bytes: 2_000_000,
    width,
    height,
    durationSeconds: null,
    sourceRunId: null,
    createdAt: "2026-10-18T09:00:00.000Z",
  })
}

function renderScreen(
  photo: Asset | "fails",
  inputs: Record<string, FieldValue>
) {
  pending.inputs = { photo: [photoId], ...inputs }
  vi.stubGlobal("Image", FakeImage)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  if (photo === "fails") {
    client.setQueryDefaults(assetQuery(photoId).queryKey, {
      queryFn: () => Promise.reject(new Error("gone")),
    })
  } else {
    client.setQueryData(assetQuery(photoId).queryKey, { asset: photo })
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(
    () =>
      useExpandScreen(
        listing,
        { use: undefined, from: undefined },
        () => undefined
      ),
    { wrapper }
  )
}

function decodeAs(width: number, height: number): void {
  FakeImage.decode = {
    load: (image) => {
      image.naturalWidth = width
      image.naturalHeight = height
    },
  }
}

function finishDecode(fails = false): void {
  const image = FakeImage.last
  act(() => {
    if (fails) {
      image?.onerror?.()
    } else {
      image?.onload?.()
    }
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  run.generate.mockReset()
  FakeImage.last = null
  FakeImage.decode = { load: () => undefined }
})

describe("the Expand Generate press before the photo's size is read", () => {
  it("waits for a photo of 1920 by 1080 pixels at 16:9, then starts no run", async () => {
    decodeAs(1920, 1080)
    const { result } = renderScreen(stored(null, null), {
      mode: "format",
      aspect: "16-9",
    })
    expect(result.current.photoState).toBe("reading")
    act(() => result.current.start.generate())
    expect(run.generate).not.toHaveBeenCalled()
    expect(result.current.start.isPending).toBe(true)
    await waitFor(() => expect(FakeImage.last).not.toBeNull())
    finishDecode()
    await waitFor(() => expect(result.current.photoState).toBe("read"))
    expect(result.current.formatCheck?.state).toBe("same")
    expect(result.current.start.isPending).toBe(false)
    expect(run.generate).not.toHaveBeenCalled()
  })

  it("waits for a photo of 1024 by 768 pixels at 16:9, then starts one run", async () => {
    decodeAs(1024, 768)
    const { result } = renderScreen(stored(null, null), {
      mode: "format",
      aspect: "16-9",
    })
    act(() => result.current.start.generate())
    await waitFor(() => expect(FakeImage.last).not.toBeNull())
    finishDecode()
    await waitFor(() => expect(run.generate).toHaveBeenCalledTimes(1))
  })

  it("refuses all four sides at 0 before the size is read", () => {
    const { result } = renderScreen(stored(null, null), { mode: "sides" })
    expect(result.current.photoState).toBe("reading")
    expect(result.current.sidesCheck?.state).toBe("noSpace")
    act(() => result.current.start.generate())
    expect(result.current.hasAskedForSpace).toBe(true)
    expect(result.current.start.isPending).toBe(false)
    expect(run.generate).not.toHaveBeenCalled()
  })

  it("marks a photo the browser cannot decode unreadable and starts no run", async () => {
    const { result } = renderScreen(stored(null, null), {
      mode: "format",
      aspect: "4-3",
    })
    await waitFor(() => expect(FakeImage.last).not.toBeNull())
    finishDecode(true)
    await waitFor(() => expect(result.current.photoState).toBe("unreadable"))
    act(() => result.current.start.generate())
    expect(run.generate).not.toHaveBeenCalled()
    expect(result.current.start.isPending).toBe(false)
  })

  it("marks a photo whose asset fails to load unreadable and starts no run", async () => {
    const { result } = renderScreen("fails", { mode: "format" })
    await waitFor(() => expect(result.current.photoState).toBe("unreadable"))
    act(() => result.current.start.generate())
    expect(run.generate).not.toHaveBeenCalled()
  })

  it("starts one run at once for a stored photo of 1024 by 768 pixels, the control", () => {
    const { result } = renderScreen(stored(1024, 768), {
      mode: "format",
      aspect: "16-9",
    })
    expect(result.current.photoState).toBe("read")
    act(() => result.current.start.generate())
    expect(run.generate).toHaveBeenCalledTimes(1)
  })
})
