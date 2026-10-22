import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  readingProblemOf,
  scaleCheckOf,
  sizeOf,
} from "@/studio/upscale/upscale-limits"
import { readLimitMs, useFileFacts } from "@/studio/upscale/use-file-facts"

const lookup = vi.hoisted(() => ({ found: true }))

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
          mime: "video/quicktime",
          bytes: 8_000_000,
          width: null,
          height: null,
          durationSeconds: null,
        },
      }
    },
  }),
}))

vi.mock("@/api/use-asset-source", () => ({
  useAssetSource: (assetId: string) =>
    assetId === ""
      ? { state: "loading" }
      : { state: "ready", src: "blob:clip" },
}))

const made: HTMLVideoElement[] = []

beforeEach(() => {
  const create = document.createElement.bind(document)
  vi.spyOn(document, "createElement").mockImplementation(
    (tag: string, options?: ElementCreationOptions) => {
      const element = create(tag, options)
      if (element instanceof HTMLVideoElement) {
        made.push(element)
      }
      return element
    }
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
  made.length = 0
  lookup.found = true
})

function renderReading(assetId: string | null) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => useFileFacts(assetId, "video"), { wrapper })
}

function lastVideo(): HTMLVideoElement {
  const video = made.at(-1)
  if (video === undefined) {
    throw new Error("No video element was made")
  }
  return video
}

describe("the upscale file reading", () => {
  it("reads nothing without a file", () => {
    const { result } = renderReading(null)
    expect(result.current).toEqual({ state: "none" })
  })

  it("stays reading until the browser reports the clip, then checks its size", async () => {
    const { result } = renderReading("clip-big")
    await waitFor(() => expect(made.length).toBeGreaterThan(0))
    expect(result.current).toEqual({ state: "reading" })
    const video = lastVideo()
    Object.defineProperty(video, "videoWidth", { value: 7680 })
    Object.defineProperty(video, "videoHeight", { value: 4320 })
    Object.defineProperty(video, "duration", { value: 5 })
    act(() => {
      video.onloadedmetadata?.(new Event("loadedmetadata"))
    })
    const reading = result.current
    expect(reading.state).toBe("read")
    const facts = reading.state === "read" ? reading.facts : null
    expect(scaleCheckOf(sizeOf(facts), 2, 3840)).toMatchObject({
      state: "tooBig",
    })
  })

  it("refuses a clip the browser cannot decode", async () => {
    const { result } = renderReading("clip-hevc")
    await waitFor(() => expect(made.length).toBeGreaterThan(0))
    act(() => {
      lastVideo().onerror?.(new Event("error"))
    })
    expect(result.current.state).toBe("read")
    expect(readingProblemOf("video", result.current)).toEqual({
      kind: "unreadable",
    })
  })

  it("refuses a clip the browser never reports once the limit passes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = renderReading("clip-silent")
    await waitFor(() => expect(made.length).toBeGreaterThan(0))
    act(() => {
      vi.advanceTimersByTime(readLimitMs - 1000)
    })
    expect(result.current).toEqual({ state: "reading" })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(readingProblemOf("video", result.current)).toEqual({
      kind: "unreadable",
    })
  })

  it("fails a clip whose lookup fails", async () => {
    lookup.found = false
    const { result } = renderReading("clip-gone")
    await waitFor(() => expect(result.current).toEqual({ state: "failed" }))
  })
})
