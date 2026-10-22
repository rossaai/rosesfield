import { type Asset, asset as assetSchema } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { makePreview } from "@/api/make-preview"
import { assetQuery } from "@/api/queries"
import { useTileSource } from "@/api/use-asset-source"

const owner = vi.hoisted(() => ({ token: null as string | null }))

vi.mock("@/api/owner-token", () => ({
  readOwnerToken: () => owner.token,
}))
vi.mock("@/api/make-preview", () => ({ makePreview: vi.fn() }))

type Sent = { url: string; method: string; headers: Headers }

const madePreview = new Blob([Uint8Array.of(0x52, 0x49, 0x46, 0x46)], {
  type: "image/webp",
})

function assetOf(id: string, kind: "image" | "video"): Asset {
  return assetSchema.parse({
    id,
    kind,
    mime: kind === "image" ? "image/png" : "video/mp4",
    bytes: 4_000_000,
    width: 1080,
    height: 1920,
    durationSeconds: kind === "video" ? 5 : null,
    sourceRunId: null,
    createdAt: "2026-10-22T10:00:00.000Z",
  })
}

function answer(route: (url: string, method: string) => Response): Sent[] {
  const sent: Sent[] = []
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
    const method = init?.method ?? "GET"
    sent.push({ url: input, method, headers: new Headers(init?.headers) })
    return route(input, method)
  })
  return sent
}

function previewOf(): Response {
  return new Response(madePreview, {
    headers: { "Content-Type": "image/webp" },
  })
}

function missing(): Response {
  return Response.json(
    { error: { code: "ASSET_PREVIEW_NOT_FOUND", status: 404 } },
    { status: 404 }
  )
}

function sourceOf(asset: Asset) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(assetQuery(asset.id).queryKey, { asset })
  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  return renderHook(() => useTileSource(asset), { wrapper: Wrapper })
}

let made = 0

beforeEach(() => {
  made = 0
  Object.assign(URL, {
    createObjectURL: () => {
      made += 1
      return `blob:made-${made}`
    },
    revokeObjectURL: () => undefined,
  })
  vi.mocked(makePreview).mockResolvedValue(madePreview)
})

afterEach(() => {
  cleanup()
  owner.token = null
  vi.unstubAllGlobals()
  vi.mocked(makePreview).mockReset()
})

describe("useTileSource", () => {
  it("shows an image's kept preview and never reads the full file", async () => {
    owner.token = "d41f6c2a9b7e4f05a8c3e1b6d2f9a074"
    const assetId = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c11"
    const sent = answer((url) =>
      url.endsWith("/preview") ? previewOf() : missing()
    )
    const tile = sourceOf(assetOf(assetId, "image"))
    await waitFor(() => expect(tile.result.current.state).toBe("ready"))
    expect(tile.result.current).toEqual({ state: "ready", src: "blob:made-1" })
    expect(sent.map((one) => one.url)).toEqual([
      `/api/assets/${assetId}/preview`,
    ])
    expect(makePreview).not.toHaveBeenCalled()
  })

  it("plays a video from its signed link with the preview as its poster", async () => {
    owner.token = "d41f6c2a9b7e4f05a8c3e1b6d2f9a074"
    const assetId = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c12"
    const link = `/api/assets/${assetId}/content?expires=1792656600000&signature=${"a".repeat(64)}`
    const sent = answer((url) => {
      if (url.endsWith("/preview")) {
        return previewOf()
      }
      if (url.endsWith("/link")) {
        return Response.json({
          url: link,
          expiresAt: "2026-10-22T10:10:00.000Z",
        })
      }
      return missing()
    })
    const tile = sourceOf(assetOf(assetId, "video"))
    await waitFor(() => expect(tile.result.current.state).toBe("ready"))
    expect(tile.result.current).toEqual({
      state: "ready",
      src: link,
      poster: "blob:made-1",
    })
    expect(sent.map((one) => one.url)).not.toContain(
      `/api/assets/${assetId}/content`
    )
  })

  it("makes the preview of a result shown in full and sends it once", async () => {
    const assetId = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c13"
    const sent = answer((url, method) => {
      if (url.endsWith("/preview") && method === "PUT") {
        return new Response(null, { status: 204 })
      }
      return missing()
    })
    const tile = sourceOf(assetOf(assetId, "image"))
    await waitFor(() =>
      expect(sent.some((one) => one.method === "PUT")).toBe(true)
    )
    expect(makePreview).toHaveBeenCalledWith(
      `/api/assets/${assetId}/content`,
      "image"
    )
    const put = sent.find((one) => one.method === "PUT")
    expect(put?.url).toBe(`/api/assets/${assetId}/preview`)
    expect(put?.headers.get("content-type")).toBe("image/webp")
    await waitFor(() =>
      expect(tile.result.current).toEqual({
        state: "ready",
        src: "blob:made-1",
      })
    )
    expect(sent.filter((one) => one.method === "PUT")).toHaveLength(1)
  })
})
