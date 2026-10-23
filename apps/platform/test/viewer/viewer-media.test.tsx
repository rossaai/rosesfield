import { type Asset, asset } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ViewerMedia } from "@/viewer/viewer-media"

const assetId = "5f6a7b8c-9d0e-4f1a-8b2c-3d4e5f6a7b01"

function meshOf(): Asset {
  return asset.parse({
    id: assetId,
    kind: "mesh",
    mime: "model/gltf-binary",
    bytes: 1_200,
    width: null,
    height: null,
    durationSeconds: null,
    sourceRunId: null,
    createdAt: "2026-10-22T10:00:00.000Z",
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("the viewer's media", () => {
  it("shows a mesh in 3D's viewer, with its Download", async () => {
    vi.stubGlobal("fetch", () => new Promise(() => undefined))
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const { container } = render(
      <QueryClientProvider client={client}>
        <ViewerMedia
          asset={meshOf()}
          aspect={{ width: 1, height: 1 }}
          onMeasure={() => undefined}
        />
      </QueryClientProvider>
    )
    expect(container.querySelector("[data-slot=mesh-output]")).not.toBeNull()
    expect(await screen.findByRole("button", { name: "Download" })).toBeTruthy()
    expect(container.querySelector("img, video")).toBeNull()
  })
})
