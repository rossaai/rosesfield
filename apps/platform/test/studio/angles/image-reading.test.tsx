import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { AppForm } from "@/screens/app/use-app-form"
import type { StartRun } from "@/screens/app/use-start-run"
import { type ImageReading, useImageFacts } from "@/studio/angles/image-check"
import { useQueuedStart } from "@/studio/angles/use-angles-screen"

const server = vi.hoisted(() => ({
  width: null as number | null,
  height: null as number | null,
  downloads: 0,
  isDownloadBroken: false,
}))

vi.mock("@/api/queries", () => ({
  assetQuery: (assetId: string) => ({
    queryKey: ["asset", assetId],
    queryFn: () => ({
      asset: {
        id: assetId,
        mime: "image/png",
        bytes: 400_000,
        width: server.width,
        height: server.height,
      },
    }),
  }),
}))

vi.mock("@/api/call-route", () => ({
  callRoute: async () => {
    server.downloads += 1
    if (server.isDownloadBroken) {
      throw new Error("The download failed")
    }
    return new Blob([new Uint8Array(8)], { type: "image/png" })
  },
}))

function renderReading(assetId: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => useImageFacts(assetId), { wrapper })
}

const facts = { mime: "image/png", bytes: 400_000, size: null }
const goodFacts = { ...facts, size: { width: 1200, height: 1600 } }

function startOf() {
  const started: StartRun = {
    generate: vi.fn(),
    isPending: false,
    error: null,
    price: "",
  }
  const form = { validate: () => true } as unknown as AppForm
  const focus = vi.fn()
  return { started, form, focus }
}

function renderStart(reading: ImageReading, isShaped = true) {
  const { started, form, focus } = startOf()
  const hook = renderHook(
    (props: { reading: ImageReading; isShaped: boolean }) =>
      useQueuedStart(form, started, props.reading, props.isShaped, focus),
    { initialProps: { reading, isShaped } }
  )
  return { ...hook, started, focus }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  server.width = null
  server.height = null
  server.downloads = 0
  server.isDownloadBroken = false
})

describe("the Angles image reading", () => {
  it("reads the size the library stored without downloading the image", async () => {
    server.width = 1200
    server.height = 1600
    const { result } = renderReading("asset-stored")
    await waitFor(() => expect(result.current.state).toBe("read"))
    expect(result.current).toEqual({ state: "read", facts: goodFacts })
    expect(server.downloads).toBe(0)
  })

  it("fails a download that fails, and reads the image after a retry", async () => {
    vi.stubGlobal("createImageBitmap", async () => ({
      width: 1200,
      height: 1600,
      close: () => undefined,
    }))
    server.isDownloadBroken = true
    const { result } = renderReading("asset-slow")
    await waitFor(() => expect(result.current.state).toBe("failed"))
    server.isDownloadBroken = false
    const reading = result.current
    act(() => {
      if (reading.state === "failed") {
        reading.retry()
      }
    })
    await waitFor(() => expect(result.current.state).toBe("read"))
    expect(server.downloads).toBe(2)
  })
})

describe("the Angles Generate press", () => {
  it("waits while the image is read, then starts the run once", () => {
    const { result, rerender, started } = renderStart({ state: "reading" })
    act(() => result.current.start.generate())
    expect(started.generate).not.toHaveBeenCalled()
    expect(result.current.start.isPending).toBe(true)
    rerender({ reading: { state: "read", facts: goodFacts }, isShaped: false })
    expect(started.generate).not.toHaveBeenCalled()
    rerender({ reading: { state: "read", facts: goodFacts }, isShaped: true })
    expect(started.generate).toHaveBeenCalledTimes(1)
    expect(result.current.start.isPending).toBe(false)
  })

  it("starts no run and moves focus to the well when the waited read fails, the control", () => {
    const { result, rerender, started, focus } = renderStart({
      state: "reading",
    })
    act(() => result.current.start.generate())
    rerender({
      reading: { state: "failed", retry: () => undefined },
      isShaped: true,
    })
    expect(started.generate).not.toHaveBeenCalled()
    expect(focus).toHaveBeenCalledTimes(1)
    expect(result.current.start.isPending).toBe(false)
  })

  it("starts at once when the image is read and fits the limits", () => {
    const { result, started } = renderStart({
      state: "read",
      facts: goodFacts,
    })
    act(() => result.current.start.generate())
    expect(started.generate).toHaveBeenCalledTimes(1)
  })
})
