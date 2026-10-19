import { appListing } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { type ReactNode, useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import {
  defaultsOf,
  type FieldProblem,
  type FormValues,
} from "@/screens/app/app-form"
import type { MediaFacts } from "@/studio/motion/motion-checks"
import { readLimitMs } from "@/studio/motion/use-media-facts"
import { clipProblemOf } from "@/studio/recast/recast-checks"
import { useRecastClip } from "@/studio/recast/use-recast-clip"
import { app } from "../../../../../packages/catalog/src/recast/app"

type Stored = Omit<MediaFacts, "seconds"> & { durationSeconds: number | null }

const lookup = vi.hoisted(() => ({
  found: true,
  asset: null as Stored | null,
}))

vi.mock("@/api/queries", () => ({
  assetQuery: (assetId: string) => ({
    queryKey: ["asset", assetId],
    queryFn: () => {
      if (!lookup.found || lookup.asset === null) {
        throw new Error("gone")
      }
      return { asset: lookup.asset }
    },
  }),
}))

vi.mock("@/api/use-asset-source", () => ({
  useAssetSource: (assetId: string) =>
    assetId === ""
      ? { state: "loading" }
      : { state: "ready", src: "blob:clip" },
}))

const listing = appListing.parse(app)

const stored = (change: Partial<Stored>): Stored => ({
  mime: "video/mp4",
  bytes: 8_000_000,
  width: 1080,
  height: 1920,
  durationSeconds: 4,
  ...change,
})

const facts = (change: Partial<MediaFacts>): MediaFacts => ({
  mime: "video/mp4",
  bytes: 8_000_000,
  width: 1080,
  height: 1920,
  seconds: 4,
  ...change,
})

function words(problem: FieldProblem | undefined): string | null {
  return problem === undefined ? null : t(problem.key, problem.values)
}

function renderClip(assetId: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(
    () => {
      const base = defaultsOf(listing)
      const [values, setValues] = useState<FormValues>({
        ...base,
        inputs: { ...base.inputs, source: [assetId] },
      })
      const clip = useRecastClip(
        {
          values,
          setForm: (change) =>
            setValues((current) => ({ ...current, ...change })),
        },
        listing
      )
      return { clip, aspectRatio: values.aspectRatio }
    },
    { wrapper }
  )
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  lookup.found = true
  lookup.asset = null
})

describe("the Recast clip checks", () => {
  it("passes a readable MP4, MOV or WebM clip of 2 to 5 seconds", () => {
    for (const mime of ["video/mp4", "video/quicktime", "video/webm"]) {
      expect(clipProblemOf(facts({ mime }))).toBeUndefined()
    }
  })

  it("refuses a video type the workflow does not take", () => {
    expect(words(clipProblemOf(facts({ mime: "video/x-matroska" })))).toBe(
      "This input takes MP4, MOV or WebM. Pick another file."
    )
  })

  it("refuses a clip the browser could not read", () => {
    expect(
      words(
        clipProblemOf(
          facts({
            mime: "video/quicktime",
            width: null,
            height: null,
            seconds: null,
          })
        )
      )
    ).toBe(
      "This input takes an MP4, MOV or WebM clip this browser can open. Pick another file."
    )
  })

  it("refuses a clip outside 2 to 5 seconds and over 100 MB", () => {
    expect(clipProblemOf(facts({ seconds: 1.5 }))?.key).toBe(
      "field.asset.tooShort"
    )
    expect(clipProblemOf(facts({ seconds: 6 }))?.key).toBe(
      "field.asset.tooLong"
    )
    expect(clipProblemOf(facts({ bytes: 200 * 1024 * 1024 }))?.key).toBe(
      "field.asset.tooLarge"
    )
  })
})

describe("the Recast clip reading", () => {
  it("stays unread while the clip is read, so Generate waits", async () => {
    lookup.asset = stored({ width: null, height: null, durationSeconds: null })
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = renderClip("asset-pending")
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.clip.isRead).toBe(false)
    expect(result.current.clip.clipProblem).toBeUndefined()
  })

  it("refuses a clip the browser never reads once the limit passes", async () => {
    lookup.asset = stored({
      mime: "video/quicktime",
      width: null,
      height: null,
      durationSeconds: null,
    })
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = renderClip("asset-hevc")
    await waitFor(() => expect(result.current.clip.isRead).toBe(false))
    act(() => {
      vi.advanceTimersByTime(readLimitMs)
    })
    expect(result.current.clip.isRead).toBe(true)
    expect(words(result.current.clip.clipProblem)).toBe(
      "This input takes an MP4, MOV or WebM clip this browser can open. Pick another file."
    )
    expect(result.current.aspectRatio).toBe("16:9")
  })

  it("refuses a clip whose library lookup fails", async () => {
    lookup.found = false
    const { result } = renderClip("asset-deleted")
    await waitFor(() => expect(result.current.clip.isRead).toBe(true))
    expect(result.current.clip.clipProblem?.key).toBe("field.asset.wrongKind")
  })

  it("sets 9:16 from a tall clip before it reports the clip read", async () => {
    lookup.asset = stored({})
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = renderClip("asset-tall")
    act(() => {
      vi.advanceTimersByTime(readLimitMs)
    })
    await waitFor(() => expect(result.current.clip.isRead).toBe(true))
    expect(result.current.aspectRatio).toBe("9:16")
    expect(result.current.clip.clip).toEqual({
      seconds: 4,
      width: 1080,
      height: 1920,
    })
  })
})
