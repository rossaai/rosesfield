import { assetResponse } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { assetQuery } from "@/api/queries"
import { imageCheckOf } from "@/studio/background-removal/image-limits"
import {
  measureLimitMs,
  useImageFacts,
} from "@/studio/background-removal/use-image-facts"

class FakeImage {
  static made: FakeImage[] = []
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  naturalWidth = 0
  naturalHeight = 0
  src = ""

  constructor() {
    FakeImage.made.push(this)
  }

  removeAttribute(name: string): void {
    if (name === "src") {
      this.src = ""
    }
  }

  load(width: number, height: number): void {
    this.naturalWidth = width
    this.naturalHeight = height
    this.onload?.()
  }

  fail(): void {
    this.onerror?.()
  }
}

type Stored = {
  mime?: string
  bytes?: number
  width?: number | null
  height?: number | null
}

const names: string[] = []

function idOf(name: string): string {
  if (!names.includes(name)) {
    names.push(name)
  }
  const index = names.indexOf(name) + 1
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`
}

function assetOf(assetId: string, stored: Stored) {
  return assetResponse.parse({
    asset: {
      id: assetId,
      kind: "image",
      mime: stored.mime ?? "image/png",
      bytes: stored.bytes ?? 400_000,
      width: stored.width ?? null,
      height: stored.height ?? null,
      durationSeconds: null,
      sourceRunId: null,
      createdAt: "2026-10-17T09:00:00.000Z",
    },
  })
}

function renderFacts(name: string | null, stored: Stored | null = {}) {
  const assetId = name === null ? null : idOf(name)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  if (assetId !== null && stored !== null) {
    client.setQueryData(assetQuery(assetId).queryKey, assetOf(assetId, stored))
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => useImageFacts(assetId), { wrapper })
}

function lastImage(): FakeImage {
  const image = FakeImage.made.at(-1)
  if (image === undefined) {
    throw new Error("No image was made")
  }
  return image
}

beforeEach(() => {
  FakeImage.made = []
  vi.stubGlobal("Image", FakeImage)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("the Remove background image facts", () => {
  it("reads nothing without an image", () => {
    const { result } = renderFacts(null)
    expect(result.current).toEqual({ state: "none" })
  })

  it("stays pending until the browser measures the image, then refuses 5,000 by 3,000", async () => {
    const { result } = renderFacts("photo-wide")
    await waitFor(() => expect(FakeImage.made).toHaveLength(1))
    expect(imageCheckOf(result.current)).toEqual({ state: "pending" })
    act(() => lastImage().load(5000, 3000))
    expect(imageCheckOf(result.current)).toMatchObject({
      state: "refused",
      problem: { kind: "tooBig", width: 5000, height: 3000 },
    })
  })

  it("refuses 48 by 48 once measured", async () => {
    const { result } = renderFacts("photo-tiny")
    await waitFor(() => expect(FakeImage.made).toHaveLength(1))
    act(() => lastImage().load(48, 48))
    expect(imageCheckOf(result.current)).toMatchObject({
      state: "refused",
      problem: { kind: "tooSmall" },
    })
  })

  it("takes a measured image in bounds", async () => {
    const { result } = renderFacts("photo-good")
    await waitFor(() => expect(FakeImage.made).toHaveLength(1))
    act(() => lastImage().load(1024, 768))
    expect(imageCheckOf(result.current)).toEqual({
      state: "valid",
      size: { width: 1024, height: 768 },
    })
  })

  it("offers a retry when the browser cannot decode the image, and measures again on retry", async () => {
    const { result } = renderFacts("photo-broken")
    await waitFor(() => expect(FakeImage.made).toHaveLength(1))
    act(() => lastImage().fail())
    const check = imageCheckOf(result.current)
    expect(check.state).toBe("unreadable")
    act(() => {
      if (check.state === "unreadable") {
        check.retry()
      }
    })
    await waitFor(() => expect(FakeImage.made).toHaveLength(2))
    expect(imageCheckOf(result.current)).toEqual({ state: "pending" })
    act(() => lastImage().load(800, 600))
    expect(imageCheckOf(result.current)).toMatchObject({ state: "valid" })
  })

  it("fails an image the browser never reports once the limit passes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = renderFacts("photo-silent")
    await waitFor(() => expect(FakeImage.made).toHaveLength(1))
    act(() => {
      vi.advanceTimersByTime(measureLimitMs - 1000)
    })
    expect(imageCheckOf(result.current)).toEqual({ state: "pending" })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(imageCheckOf(result.current).state).toBe("unreadable")
  })

  it("keeps a measured size after the limit passes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = renderFacts("photo-early")
    await waitFor(() => expect(FakeImage.made).toHaveLength(1))
    act(() => lastImage().load(1024, 768))
    act(() => {
      vi.advanceTimersByTime(measureLimitMs)
    })
    expect(imageCheckOf(result.current).state).toBe("valid")
  })

  it("uses a stored size and measures nothing", () => {
    const { result } = renderFacts("photo-stored", { width: 4097, height: 100 })
    expect(FakeImage.made).toHaveLength(0)
    expect(imageCheckOf(result.current)).toMatchObject({
      state: "refused",
      problem: { kind: "tooBig" },
    })
  })

  it("refuses a wrong kind without measuring it", () => {
    const { result } = renderFacts("photo-gif", { mime: "image/gif" })
    expect(FakeImage.made).toHaveLength(0)
    expect(imageCheckOf(result.current)).toEqual({
      state: "refused",
      problem: { kind: "wrongKind" },
    })
  })

  it("offers a retry when the asset lookup fails", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("offline")
    })
    const { result } = renderFacts("photo-gone", null)
    await waitFor(() =>
      expect(imageCheckOf(result.current).state).toBe("unreadable")
    )
  })
})
