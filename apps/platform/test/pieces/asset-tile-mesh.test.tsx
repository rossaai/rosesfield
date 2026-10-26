import { type Asset, asset } from "@rosesfield/contract"
import { ToastProvider } from "@rosesfield/ui/components/toast"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { assetQuery } from "@/api/queries"
import { AssetTile } from "@/pieces/asset-tile"
import { MeshRenderer } from "@/studio/three-d/mesh-renderer"
import { triangleGlb } from "../studio/three-d/glb-bytes"

const assetId = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c31"
const runId = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e31"

function meshOf(sourceRunId: string | null): Asset {
  return asset.parse({
    id: assetId,
    kind: "mesh",
    mime: "model/gltf-binary",
    bytes: 48_000,
    width: null,
    height: null,
    durationSeconds: null,
    sourceRunId,
    createdAt: "2026-10-22T09:00:03.000Z",
  })
}

function renderTile(held: Asset, tiles: 1 | 2 = 1) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(assetQuery(assetId).queryKey, { asset: held })
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <ToastProvider>
          <TooltipProvider>
            <AssetTile assetId={assetId} />
            {tiles === 2 ? <AssetTile assetId={assetId} /> : null}
          </TooltipProvider>
        </ToastProvider>
      ),
    }),
    history: createMemoryHistory({ initialEntries: ["/library"] }),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return router
}

async function meshTile(): Promise<HTMLButtonElement> {
  return waitFor(() => {
    const found = document.querySelector<HTMLButtonElement>(
      "button[data-kind=mesh]"
    )
    if (found === null) {
      throw new Error("no mesh tile")
    }
    return found
  })
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const drawnStill = "data:image/webp;base64,UklGRhIAAABXRUJQVlA4TA=="

function serveGlb(): void {
  vi.stubGlobal("fetch", (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : input.toString()
    return url.includes(`/api/assets/${assetId}/content`)
      ? Promise.resolve(new Response(triangleGlb(), { status: 200 }))
      : new Promise(() => undefined)
  })
}

function fakeRenderer() {
  const renderer = {
    load: vi.fn((_scene: unknown) => Promise.resolve()),
    draw: vi.fn(),
    release: vi.fn(),
  }
  vi.spyOn(MeshRenderer, "of").mockReturnValue(
    renderer as unknown as MeshRenderer
  )
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(drawnStill)
  return renderer
}

describe("the picture of a 3D model on its tile", () => {
  it("shows a still drawn from its GLB, with the 3D mark as a corner badge", async () => {
    serveGlb()
    const renderer = fakeRenderer()
    renderTile(meshOf(runId))
    const tile = await meshTile()
    const still = await waitFor(() => {
      const found = tile.querySelector("img[data-slot=asset-thumb-still]")
      if (found === null) {
        throw new Error("no still")
      }
      return found
    })
    expect(still.getAttribute("src")).toBe(drawnStill)
    const [scene] = renderer.load.mock.calls[0] ?? []
    expect(scene).toMatchObject({
      parts: [{ indices: expect.any(Uint32Array) }],
    })
    expect(renderer.draw).toHaveBeenCalledTimes(1)
    expect(renderer.release).toHaveBeenCalledTimes(1)
    const mark = tile.querySelector("[data-slot=asset-thumb-mark]")
    expect(mark?.className).toContain("absolute")
    expect(mark?.querySelector("svg")?.getAttribute("class")).toContain(
      "lucide-box"
    )
  })

  it("draws one still for two tiles of one model and keeps it", async () => {
    serveGlb()
    const renderer = fakeRenderer()
    renderTile(meshOf(runId), 2)
    await waitFor(() => {
      expect(
        document.querySelectorAll("img[data-slot=asset-thumb-still]")
      ).toHaveLength(2)
    })
    expect(renderer.draw).toHaveBeenCalledTimes(1)
  })

  it("keeps the 3D mark alone when the browser draws no 3D, the control", async () => {
    serveGlb()
    const of = vi.spyOn(MeshRenderer, "of").mockReturnValue(null)
    renderTile(meshOf(runId))
    const tile = await meshTile()
    await waitFor(() => expect(of).toHaveBeenCalledTimes(1))
    expect(tile.querySelector("img")).toBeNull()
    const mark = tile.querySelector("[data-slot=asset-thumb-mark]")
    expect(mark?.className).not.toContain("absolute")
  })

  it("draws nothing until the tile scrolls into view", async () => {
    serveGlb()
    const renderer = fakeRenderer()
    const watched: Element[] = []
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = (element: Element): void => {
          watched.push(element)
        }
        disconnect = (): undefined => undefined
      }
    )
    renderTile(meshOf(runId))
    const tile = await meshTile()
    await waitFor(() => expect(watched).toContain(tile))
    expect(renderer.load).not.toHaveBeenCalled()
    expect(tile.querySelector("img")).toBeNull()
  })
})

describe("a mesh in the library", () => {
  it("shows a tile with the 3D mark and no picture", async () => {
    renderTile(meshOf(runId))
    const tile = await meshTile()
    const mark = tile.querySelector("[data-slot=asset-thumb-mark] svg")
    expect(mark?.getAttribute("class")).toContain("lucide-box")
    expect(document.querySelector("img")).toBeNull()
    expect(document.querySelector("video")).toBeNull()
  })

  it.each([
    { made: "a run made", sourceRunId: runId },
    { made: "you uploaded", sourceRunId: null },
  ])(
    "opens 3D on the mesh you pressed, for a GLB $made",
    async ({ sourceRunId }) => {
      const router = renderTile(meshOf(sourceRunId))
      fireEvent.click(await meshTile())
      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/apps/three-d")
      })
      expect(router.state.location.search).toEqual({ open: assetId })
    }
  )
})
