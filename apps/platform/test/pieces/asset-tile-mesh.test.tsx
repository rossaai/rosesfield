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

function renderTile(held: Asset) {
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
  vi.unstubAllGlobals()
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

  it("opens 3D with the run that made it when you press it", async () => {
    const router = renderTile(meshOf(runId))
    fireEvent.click(await meshTile())
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/apps/three-d")
    })
    expect(router.state.location.search).toEqual({ from: runId })
  })

  it("opens 3D with no run for a GLB you uploaded", async () => {
    const router = renderTile(meshOf(null))
    fireEvent.click(await meshTile())
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/apps/three-d")
    })
    expect(router.state.location.search).toEqual({})
  })
})
