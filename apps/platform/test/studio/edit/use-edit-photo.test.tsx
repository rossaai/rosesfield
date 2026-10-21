import { type Asset, asset } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { type ReactNode, useCallback, useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { assetQuery } from "@/api/queries"
import { formatBytes } from "@/copy/format"
import { t } from "@/copy/t"
import { DeviceProvider } from "@/device/device-context"
import type { FieldValue, FormValues } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"
import type { ImageSlot } from "@/studio/edit/edit-form"
import { useEditPhoto } from "@/studio/edit/use-edit-photo"
import { assetIds } from "../../sample-app"
import { FakeDevice } from "./fake-device"

const [photo = "", other = "", third = ""] = assetIds

const oneSlot: ImageSlot[] = [{ name: "image", max: 1 }]
const twoSlots: ImageSlot[] = [
  { name: "person", max: 1 },
  { name: "clothes", max: 1 },
]

let opened = 0

beforeEach(() => {
  opened = 0
  vi.stubGlobal(
    "XMLHttpRequest",
    class {
      upload: { onprogress: unknown } = { onprogress: null }
      open = (): void => {
        opened += 1
      }
      setRequestHeader = (): void => undefined
      send = (): void => undefined
      abort = (): void => undefined
    }
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function stored(id: string, width: number, height: number): Asset {
  return asset.parse({
    id,
    kind: "image",
    mime: "image/png",
    bytes: 2_000_000,
    width,
    height,
    durationSeconds: null,
    sourceRunId: null,
    createdAt: "2026-10-20T09:00:00.000Z",
  })
}

function useTestForm(): AppForm {
  const [values, setValues] = useState<FormValues>({
    inputs: {},
    seedMode: "random",
    count: 1,
    aspectRatio: null,
  })
  const setInput = useCallback((name: string, value: FieldValue) => {
    setValues((current) => ({
      ...current,
      inputs: { ...current.inputs, [name]: value },
    }))
  }, [])
  return {
    values,
    problems: new Map(),
    setInput,
    setForm: (change) => setValues((current) => ({ ...current, ...change })),
    fill: setValues,
    validate: () => true,
    register: () => undefined,
  }
}

type Setup = {
  slots?: ImageSlot[]
  initial?: string | null
  files?: File[]
  assets?: Asset[]
}

function setup(options: Setup = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  for (const one of options.assets ?? []) {
    client.setQueryData(assetQuery(one.id).queryKey, { asset: one })
  }
  const device = new FakeDevice({ files: options.files ?? [] })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <DeviceProvider device={device}>{children}</DeviceProvider>
    </QueryClientProvider>
  )
  return renderHook(
    () => {
      const form = useTestForm()
      const edit = useEditPhoto(
        form,
        options.slots ?? oneSlot,
        options.initial ?? null
      )
      return { form, edit }
    },
    { wrapper }
  )
}

function sized(width: number, height: number): void {
  vi.stubGlobal("createImageBitmap", async () => ({
    width,
    height,
    close: () => undefined,
  }))
}

describe("the photo held across Edit's tools", () => {
  it("places the photo it opened with in the tool's image input", async () => {
    const { result } = setup({
      initial: photo,
      assets: [stored(photo, 1200, 800)],
    })
    await waitFor(() => {
      expect(result.current.form.values.inputs.image).toEqual([photo])
    })
    expect(result.current.edit.photo).toBe(photo)
  })

  it("puts the photo back when a model change empties the inputs", async () => {
    const { result } = setup({
      initial: photo,
      assets: [stored(photo, 1200, 800)],
    })
    await waitFor(() => {
      expect(result.current.form.values.inputs.image).toEqual([photo])
    })
    act(() => result.current.form.setForm({ inputs: { model: "next" } }))
    await waitFor(() => {
      expect(result.current.form.values.inputs.image).toEqual([photo])
    })
  })

  it("takes the photo of a run you recreate", async () => {
    const { result } = setup({
      initial: photo,
      assets: [stored(photo, 1200, 800), stored(other, 1200, 800)],
    })
    act(() => result.current.form.setInput("image", [other]))
    await waitFor(() => {
      expect(result.current.edit.photo).toBe(other)
    })
  })

  it("lets you remove the photo, and keeps it removed", async () => {
    const { result } = setup({
      initial: photo,
      assets: [stored(photo, 1200, 800)],
    })
    await waitFor(() => {
      expect(result.current.form.values.inputs.image).toEqual([photo])
    })
    act(() => result.current.edit.remove(photo))
    await waitFor(() => {
      expect(result.current.edit.photo).toBeNull()
    })
    expect(result.current.form.values.inputs.image).toEqual([])
  })
})

describe("adding a photo", () => {
  it("refuses a file that is not an image, with the reason, and sends nothing", async () => {
    const { result } = setup({
      files: [new File(["notes"], "notes.txt", { type: "text/plain" })],
    })
    act(() => result.current.edit.upload())
    await waitFor(() => {
      expect(result.current.edit.message).toBe(
        t("field.asset.wrongKind", { kinds: "PNG, JPEG or WebP" })
      )
    })
    expect(result.current.edit.photo).toBeNull()
    expect(opened).toBe(0)
  })

  it("refuses a file over 20 MB, with its size and the limit, and sends nothing", async () => {
    sized(2000, 2000)
    const big = new File([new Uint8Array(20_000_001)], "big.png", {
      type: "image/png",
    })
    const { result } = setup({ files: [big] })
    act(() => result.current.edit.upload())
    await waitFor(() => {
      expect(result.current.edit.message).toBe(
        t("field.asset.tooLarge", {
          size: formatBytes(20_000_001),
          limit: formatBytes(20_000_000),
        })
      )
    })
    expect(opened).toBe(0)
  })

  it("refuses an image under 480 pixels on its shorter side, with the reason, and sends nothing", async () => {
    sized(900, 479)
    const small = new File([new Uint8Array(10)], "small.png", {
      type: "image/png",
    })
    const { result } = setup({ files: [small] })
    act(() => result.current.edit.upload())
    await waitFor(() => {
      expect(result.current.edit.message).toContain("480")
    })
    expect(result.current.edit.photo).toBeNull()
    expect(opened).toBe(0)
  })

  it("sends a photo that passes the checks", async () => {
    sized(900, 480)
    const fine = new File([new Uint8Array(10)], "fine.png", {
      type: "image/png",
    })
    const { result } = setup({ files: [fine] })
    act(() => result.current.edit.upload())
    await waitFor(() => {
      expect(opened).toBe(1)
    })
    expect(result.current.edit.message).toBeNull()
  })

  it("refuses a library image under 480 pixels, and takes one that passes", async () => {
    const { result } = setup({
      assets: [stored(photo, 640, 320), stored(other, 640, 480)],
    })
    act(() => result.current.edit.addFromLibrary([photo]))
    await waitFor(() => {
      expect(result.current.edit.message).toContain("480")
    })
    expect(result.current.edit.photo).toBeNull()
    act(() => result.current.edit.addFromLibrary([other]))
    await waitFor(() => {
      expect(result.current.edit.photo).toBe(other)
    })
    expect(result.current.edit.message).toBeNull()
  })

  it("puts a second image in the tool's second image input, such as the garment on Try-on", async () => {
    const { result } = setup({
      slots: twoSlots,
      initial: photo,
      assets: [stored(photo, 900, 1200), stored(third, 900, 1200)],
    })
    await waitFor(() => {
      expect(result.current.form.values.inputs.person).toEqual([photo])
    })
    act(() => result.current.edit.addFromLibrary([third]))
    await waitFor(() => {
      expect(result.current.form.values.inputs.clothes).toEqual([third])
    })
    expect(result.current.edit.photo).toBe(photo)
    expect(result.current.edit.extras).toEqual([third])
  })
})

describe("a held photo that fails the checks", () => {
  it("says why and is marked refused", async () => {
    const { result } = setup({
      initial: photo,
      assets: [stored(photo, 300, 300)],
    })
    await waitFor(() => {
      expect(result.current.edit.isRefused).toBe(true)
    })
    expect(result.current.edit.message).toContain("480")
  })
})
