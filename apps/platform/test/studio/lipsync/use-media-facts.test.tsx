import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { readLimitMs, useMediaFacts } from "@/studio/lipsync/use-media-facts"

const lookup = vi.hoisted(() => ({
  state: "found" as "found" | "gone" | "hung",
}))

vi.mock("@/api/queries", () => ({
  assetQuery: (assetId: string) => ({
    queryKey: ["asset", assetId],
    queryFn: () => {
      if (lookup.state === "gone") {
        throw new Error("gone")
      }
      if (lookup.state === "hung") {
        return new Promise(() => undefined)
      }
      return {
        asset: {
          mime: "audio/mpeg",
          bytes: 200_000,
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
      : { state: "ready", src: "blob:audio" },
}))

function renderReading(assetId: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => useMediaFacts(assetId, "audio"), { wrapper })
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  lookup.state = "found"
})

describe("the lip sync media reading", () => {
  it("fails audio whose asset is gone, so the well stops reading", async () => {
    lookup.state = "gone"
    const { result } = renderReading("asset-deleted")
    await waitFor(() => expect(result.current.state).toBe("failed"))
  })

  it("reads audio the browser never measures with no length once the limit passes", async () => {
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
        mime: "audio/mpeg",
        bytes: 200_000,
        width: null,
        height: null,
        seconds: null,
      },
    })
  })

  it("fails audio whose asset record never arrives once the limit passes", async () => {
    lookup.state = "hung"
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = renderReading("asset-hung")
    expect(result.current.state).toBe("reading")
    act(() => {
      vi.advanceTimersByTime(readLimitMs)
    })
    expect(result.current.state).toBe("failed")
  })
})
