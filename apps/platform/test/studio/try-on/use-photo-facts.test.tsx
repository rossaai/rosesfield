import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readingProblemOf } from "@/studio/try-on/try-on-limits"
import { readLimitMs, usePhotoFacts } from "@/studio/try-on/use-photo-facts"

const lookup = vi.hoisted(() => ({ found: true, source: "ready" }))

vi.mock("@/api/queries", () => ({
  assetQuery: (assetId: string) => ({
    queryKey: ["asset", assetId],
    queryFn: () => {
      if (!lookup.found) {
        throw new Error("gone")
      }
      return {
        asset: {
          id: assetId,
          mime: "image/png",
          bytes: 2_000_000,
          width: null,
          height: null,
          durationSeconds: null,
        },
      }
    },
  }),
}))

vi.mock("@/api/use-asset-source", () => ({
  useAssetSource: (assetId: string) => {
    if (assetId === "") {
      return { state: "loading" }
    }
    return lookup.source === "failed"
      ? { state: "failed", retry: () => undefined }
      : { state: "ready", src: "blob:photo" }
  },
}))

class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  naturalWidth = 0
  naturalHeight = 0
  src = ""
  removeAttribute(): void {
    this.src = ""
  }
}

const made: FakeImage[] = []

beforeEach(() => {
  vi.stubGlobal(
    "Image",
    class extends FakeImage {
      constructor() {
        super()
        made.push(this)
      }
    }
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  made.length = 0
  lookup.found = true
  lookup.source = "ready"
})

function renderReading(assetId: string | null) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => usePhotoFacts(assetId), { wrapper })
}

function lastImage(): FakeImage {
  const image = made.at(-1)
  if (image === undefined) {
    throw new Error("No image was made")
  }
  return image
}

describe("the Try-on photo reading", () => {
  it("reads nothing without a photo", () => {
    const { result } = renderReading(null)
    expect(result.current).toEqual({ state: "none" })
  })

  it("stays reading until the browser measures the photo, then checks its size", async () => {
    const { result } = renderReading("photo-small")
    await waitFor(() => expect(made.length).toBeGreaterThan(0))
    expect(result.current).toEqual({ state: "reading" })
    expect(readingProblemOf("person", result.current)).toBeNull()
    const image = lastImage()
    image.naturalWidth = 480
    image.naturalHeight = 640
    act(() => {
      image.onload?.()
    })
    expect(result.current.state).toBe("read")
    expect(readingProblemOf("person", result.current)).toEqual({
      kind: "tooSmall",
      side: 480,
      min: 512,
    })
  })

  it("refuses a photo the browser cannot decode", async () => {
    const { result } = renderReading("photo-corrupt")
    await waitFor(() => expect(made.length).toBeGreaterThan(0))
    act(() => {
      lastImage().onerror?.()
    })
    expect(result.current.state).toBe("read")
    expect(readingProblemOf("person", result.current)).toEqual({
      kind: "unreadable",
    })
  })

  it("refuses a photo the browser never measures once the limit passes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = renderReading("photo-silent")
    await waitFor(() => expect(made.length).toBeGreaterThan(0))
    act(() => {
      vi.advanceTimersByTime(readLimitMs - 1000)
    })
    expect(result.current).toEqual({ state: "reading" })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(readingProblemOf("clothes", result.current)).toEqual({
      kind: "unreadable",
    })
  })

  it("refuses a photo whose file does not download", async () => {
    lookup.source = "failed"
    const { result } = renderReading("photo-lost")
    await waitFor(() => expect(result.current.state).toBe("read"))
    expect(readingProblemOf("person", result.current)).toEqual({
      kind: "unreadable",
    })
  })

  it("fails a photo whose lookup fails", async () => {
    lookup.found = false
    const { result } = renderReading("photo-gone")
    await waitFor(() => expect(result.current).toEqual({ state: "failed" }))
    expect(readingProblemOf("person", result.current)).toEqual({
      kind: "unreadable",
    })
  })
})
