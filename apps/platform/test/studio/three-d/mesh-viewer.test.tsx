import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  Device,
  type DeviceFile,
  type PickFilesOptions,
} from "@/device/device.port"
import { DeviceProvider } from "@/device/device-context"
import { parseGlb } from "@/studio/three-d/glb"
import { meshFileName, meshQuery } from "@/studio/three-d/mesh-file"
import { MeshRenderer } from "@/studio/three-d/mesh-renderer"
import {
  MeshDownload,
  MeshOnAsk,
  MeshOutput,
  MeshView,
  wheelPixels,
} from "@/studio/three-d/mesh-viewer"
import { triangleGlb } from "./glb-bytes"

class FakeDevice extends Device {
  readonly saved: DeviceFile[] = []

  override pickFiles(_options: PickFilesOptions): Promise<File[]> {
    return Promise.resolve([])
  }

  override save(file: DeviceFile): Promise<void> {
    this.saved.push(file)
    return Promise.resolve()
  }

  override canShare(_file: DeviceFile): boolean {
    return false
  }

  override share(_file: DeviceFile): Promise<void> {
    return Promise.resolve()
  }

  override copyText(_text: string): Promise<void> {
    return Promise.resolve()
  }
}

const assetId = "4e5f6a7b-8c9d-4e0f-8a1b-2c3d4e5f6a01"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function renderWith(
  piece: ReactElement,
  blob: Blob,
  device: Device = new FakeDevice()
): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const bytes = triangleGlb()
  client.setQueryData(meshQuery(assetId).queryKey, {
    blob,
    scene: parseGlb(bytes),
  })
  render(
    <QueryClientProvider client={client}>
      <DeviceProvider device={device}>{piece}</DeviceProvider>
    </QueryClientProvider>
  )
}

describe("the 3D download", () => {
  it("saves the model as a GLB file named for its asset", async () => {
    const device = new FakeDevice()
    const blob = new Blob([triangleGlb()], {
      type: "application/octet-stream",
    })
    renderWith(<MeshDownload assetId={assetId} />, blob, device)
    fireEvent.click(screen.getByRole("button", { name: "Download" }))
    await waitFor(() => expect(device.saved).toHaveLength(1))
    const [file] = device.saved
    expect(file?.name).toBe("rosesfield-4e5f6a7b.glb")
    expect(file?.blob.type).toBe("model/gltf-binary")
    expect(file?.blob.size).toBe(blob.size)
  })

  const unreadable: [string, Readonly<Record<string, unknown>>][] = [
    [
      "needs an extension it cannot decode",
      { extensionsRequired: ["KHR_draco_mesh_compression"] },
    ],
    [
      "has a negative offset",
      {
        accessors: [
          {
            bufferView: 0,
            byteOffset: -4,
            componentType: 5126,
            count: 3,
            type: "VEC3",
          },
          { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" },
        ],
      },
    ],
  ]

  const cannotShow = "says it cannot show a model that %s and saves its file"

  it.each(unreadable)(cannotShow, async (_, extra) => {
    const bytes = triangleGlb(extra)
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response(bytes, { status: 200 }))
    )
    const device = new FakeDevice()
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={client}>
        <DeviceProvider device={device}>
          <MeshOutput assetId={assetId} />
        </DeviceProvider>
      </QueryClientProvider>
    )
    expect(
      await screen.findByText("This model did not open in the viewer")
    ).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Download" }))
    await waitFor(() => expect(device.saved).toHaveLength(1))
    expect(device.saved[0]?.blob.size).toBe(bytes.byteLength)
    const alerts = screen.getAllByRole("alert")
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.textContent).toContain(
      "This model did not open in the viewer"
    )
  })

  it("names every file with the .glb extension", () => {
    expect(meshFileName(assetId).endsWith(".glb")).toBe(true)
  })
})

describe("the 3D viewer", () => {
  it("says the browser draws no 3D and offers the GLB when WebGL 2 is missing", async () => {
    renderWith(<MeshView assetId={assetId} />, new Blob([triangleGlb()]))
    expect(
      await screen.findByText("This browser does not draw 3D models")
    ).toBeTruthy()
  })

  it("says the model did not open when its file is not a GLB", () => {
    const client = new QueryClient()
    client.setQueryData(meshQuery(assetId).queryKey, {
      blob: new Blob(["solid cube"]),
      scene: null,
    })
    render(
      <QueryClientProvider client={client}>
        <MeshView assetId={assetId} />
      </QueryClientProvider>
    )
    const failed = screen.getByText("This model did not open in the viewer")
    expect(failed).toBeTruthy()
  })

  it("reads a scroll in lines, in pages and in pixels as pixels", () => {
    const plain = { deltaY: 3, deltaMode: 0, ctrlKey: false }
    expect(wheelPixels(plain, 400)).toBe(3)
    expect(wheelPixels({ ...plain, deltaMode: 1 }, 400)).toBe(48)
    expect(wheelPixels({ ...plain, deltaMode: 2 }, 400)).toBe(1200)
    expect(wheelPixels({ ...plain, ctrlKey: true }, 400)).toBe(12)
  })

  it("says the viewer stopped and draws again when the browser drops its WebGL context", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe(): void {}
        disconnect(): void {}
      }
    )
    const dispose = vi.fn()
    const fake = { load: vi.fn(), draw: vi.fn(), dispose }
    const of = vi
      .spyOn(MeshRenderer, "of")
      .mockReturnValue(fake as unknown as MeshRenderer)
    renderWith(<MeshView assetId={assetId} />, new Blob([triangleGlb()]))
    const canvas = await screen.findByRole("application")
    fireEvent(canvas, new Event("webglcontextlost"))

    expect(
      await screen.findByText("The viewer stopped drawing this model")
    ).toBeTruthy()
    expect(dispose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByRole("application")).toBeTruthy()
    expect(of).toHaveBeenCalledTimes(2)
  })
})

describe("an earlier 3D model", () => {
  it("fetches nothing and draws nothing until you ask to see it", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, enabled: false } },
    })
    const { container } = render(
      <QueryClientProvider client={client}>
        <MeshOnAsk assetId={assetId} />
      </QueryClientProvider>
    )
    const key = meshQuery(assetId).queryKey
    expect(container.querySelector("canvas")).toBeNull()
    expect(client.getQueryCache().find({ queryKey: key })).toBeUndefined()
    expect(screen.getByRole("button", { name: "Download" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Show the model" }))
    expect(container.querySelector("[data-slot=mesh-output]")).toBeTruthy()
    expect(client.getQueryCache().find({ queryKey: key })).toBeDefined()
  })
})
