import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import { clipProblem } from "@/studio/motion/motion-checks"
import { readLimitMs, useMediaFacts } from "@/studio/motion/use-media-facts"

const lookup = vi.hoisted(() => ({ found: true, recordsFacts: true }))

vi.mock("@/api/queries", () => ({
  assetQuery: (assetId: string) => ({
    queryKey: ["asset", assetId],
    queryFn: () => {
      if (!lookup.found) {
        throw new Error("gone")
      }
      if (!lookup.recordsFacts) {
        return {
          asset: {
            mime: "video/quicktime",
            bytes: 8_000_000,
            width: null,
            height: null,
            durationSeconds: null,
          },
        }
      }
      return {
        asset: {
          mime: "video/mp4",
          bytes: 8_000_000,
          width: 720,
          height: 1280,
          durationSeconds: 5,
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

function renderReading(assetId: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => useMediaFacts(assetId, "video"), { wrapper })
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  lookup.found = true
  lookup.recordsFacts = true
})

describe("the motion media reading", () => {
  it("fails a clip whose lookup fails, so the well stops reading", async () => {
    lookup.found = false
    const { result } = renderReading("asset-deleted")
    await waitFor(() => expect(result.current.state).toBe("failed"))
  })

  it("reads a clip whose browser never reports its metadata once the limit passes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = renderReading("asset-silent")
    await waitFor(() => expect(result.current.state).toBe("reading"))
    act(() => {
      vi.advanceTimersByTime(readLimitMs - 1000)
    })
    expect(result.current.state).toBe("reading")
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).toEqual({
      state: "read",
      facts: {
        mime: "video/mp4",
        bytes: 8_000_000,
        width: 720,
        height: 1280,
        seconds: 5,
      },
    })
  })

  it("refuses an upload that records no size or length when the browser never reads it", async () => {
    lookup.recordsFacts = false
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = renderReading("asset-hevc")
    await waitFor(() => expect(result.current.state).toBe("reading"))
    act(() => {
      vi.advanceTimersByTime(readLimitMs)
    })
    expect(result.current).toEqual({
      state: "read",
      facts: {
        mime: "video/quicktime",
        bytes: 8_000_000,
        width: null,
        height: null,
        seconds: null,
      },
    })
    const reading = result.current
    const problem = reading.state === "read" ? clipProblem(reading.facts) : null
    expect(problem === null ? null : t(problem.key, problem.values)).toBe(
      "This input takes an MP4, MOV or WebM clip this browser can open. Pick another file."
    )
  })
})
