import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { makePreview } from "@/api/make-preview"
import { assetPreviewKey } from "@/api/use-asset-source"
import { MeshRenderer } from "@/studio/three-d/mesh-renderer"
import { useMeshStill } from "@/studio/three-d/mesh-still"
import { triangleGlb } from "./glb-bytes"

vi.mock("@/api/make-preview", () => ({ makePreview: vi.fn() }))

type Sent = { url: string; method: string; headers: Headers }

const painted = "data:image/webp;base64,UklGRg=="
const madePreview = new Blob([Uint8Array.of(0x52, 0x49, 0x46, 0x46)], {
  type: "image/webp",
})

function answer(hasStored: boolean): Sent[] {
  const sent: Sent[] = []
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
    const method = init?.method ?? "GET"
    sent.push({ url: input, method, headers: new Headers(init?.headers) })
    if (!input.endsWith("/preview")) {
      return new Response(triangleGlb(), { status: 200 })
    }
    if (method === "PUT") {
      return new Response(null, { status: 204 })
    }
    return hasStored
      ? new Response(madePreview, { headers: { "Content-Type": "image/webp" } })
      : Response.json(
          { error: { code: "ASSET_PREVIEW_NOT_FOUND", status: 404 } },
          { status: 404 }
        )
  })
  return sent
}

function stillOf(assetId: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  const hook = renderHook(() => useMeshStill(assetId, true), {
    wrapper: Wrapper,
  })
  return { client, hook }
}

function putsOf(sent: Sent[]): Sent[] {
  return sent.filter((one) => one.method === "PUT")
}

beforeEach(() => {
  vi.spyOn(MeshRenderer, "of").mockReturnValue({
    load: vi.fn(() => Promise.resolve()),
    draw: vi.fn(),
    release: vi.fn(),
  } as unknown as MeshRenderer)
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(painted)
  Object.assign(URL, {
    createObjectURL: () => "blob:kept-still",
    revokeObjectURL: () => undefined,
  })
  vi.mocked(makePreview).mockResolvedValue(madePreview)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.mocked(makePreview).mockReset()
})

describe("a 3D model's painted still", () => {
  it("goes to the preview route once when the server holds none, and not again", async () => {
    const assetId = "4e5f6a7b-8c9d-4e0f-8a1b-2c3d4e5f6a11"
    const sent = answer(false)
    const first = stillOf(assetId)
    await waitFor(() => expect(first.hook.result.current).toBe(painted))
    await waitFor(() => expect(putsOf(sent)).toHaveLength(1))
    expect(makePreview).toHaveBeenCalledWith(painted, "image")
    const [put] = putsOf(sent)
    expect(put?.url).toBe(`/api/assets/${assetId}/preview`)
    expect(put?.headers.get("content-type")).toBe("image/webp")
    expect(first.client.getQueryData(assetPreviewKey(assetId))).toBe(
      "blob:kept-still"
    )

    const second = stillOf(assetId)
    await waitFor(() => expect(second.hook.result.current).toBe(painted))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(putsOf(sent)).toHaveLength(1)
  })

  it("is not sent when the server already holds a preview", async () => {
    const assetId = "4e5f6a7b-8c9d-4e0f-8a1b-2c3d4e5f6a12"
    const sent = answer(true)
    const { hook } = stillOf(assetId)
    await waitFor(() => expect(hook.result.current).toBe(painted))
    await waitFor(() =>
      expect(
        sent.some((one) => one.method === "GET" && one.url.endsWith("/preview"))
      ).toBe(true)
    )
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(putsOf(sent)).toHaveLength(0)
    expect(makePreview).not.toHaveBeenCalled()
  })
})
