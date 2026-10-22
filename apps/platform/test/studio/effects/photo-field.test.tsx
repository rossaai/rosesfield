import { effectsApp, recipeOf } from "@rosesfield/catalog/effects"
import {
  type Asset,
  appDefinition,
  appListing,
  asset,
} from "@rosesfield/contract"
import { ToastProvider } from "@rosesfield/ui/components/toast"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { type ReactElement, useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { assetQuery, assetsQuery } from "@/api/queries"
import { isAssetInput } from "@/catalog/app-facts"
import { formatBytes } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import {
  Device,
  type DeviceFile,
  type PickFilesOptions,
} from "@/device/device.port"
import { DeviceProvider } from "@/device/device-context"
import type { FieldValue } from "@/screens/app/app-form"
import { PhotoField } from "@/studio/effects/photo-field"

const photoId = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01"

const app = appListing.parse(
  appDefinition.parse(
    effectsApp([
      {
        ...recipeOf("grow-giant"),
        passed: true,
        preview: {
          file: "grow-giant.mp4",
          runId: "5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e",
          seed: 7,
          resolution: "480p",
          aspectRatio: "9:16",
          workflowHash:
            "ed50011518009bb7519b8d93286267699aeb1c3863c4fe89c4ade3470cf8673f",
        },
      },
    ])
  )
)

const photoInput = app.inputs.find((input) => input.name === "image")

const portrait: Asset = asset.parse({
  id: photoId,
  kind: "image",
  mime: "image/jpeg",
  bytes: 2_400_000,
  width: 1200,
  height: 1600,
  durationSeconds: null,
  sourceRunId: null,
  createdAt: "2026-10-20T09:00:00.000Z",
})

class PickedDevice extends Device {
  readonly picked: File[]

  constructor(picked: File[]) {
    super()
    this.picked = picked
  }

  override pickFiles(_options: PickFilesOptions): Promise<File[]> {
    return Promise.resolve(this.picked)
  }

  override save(_file: DeviceFile): Promise<void> {
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

type Seen = { messages: (string | null)[] }

function Field({
  first,
  message,
  seen,
  title,
}: {
  first: string[]
  message: string | null
  seen: Seen
  title?: string
}): ReactElement {
  const [value, setValue] = useState<FieldValue>(first)
  if (photoInput === undefined || !isAssetInput(photoInput)) {
    throw new Error("the effects app has no photo input")
  }
  return (
    <PhotoField
      app={app}
      input={photoInput}
      value={value}
      problem={undefined}
      onChange={setValue}
      register={() => undefined}
      title={title}
      message={message}
      onMessage={(next) => seen.messages.push(next)}
    />
  )
}

function renderField(options: {
  first: string[]
  message?: string | null
  picked?: File[]
  title?: string
}): Seen {
  const seen: Seen = { messages: [] }
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(assetQuery(photoId).queryKey, { asset: portrait })
  client.setQueryData(assetsQuery("image").queryKey, {
    pages: [{ assets: [portrait], next: null }],
    pageParams: [null],
  })
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <DeviceProvider device={new PickedDevice(options.picked ?? [])}>
          <ToastProvider>
            <TooltipProvider>
              <Field
                first={options.first}
                message={options.message ?? null}
                seen={seen}
                {...(options.title === undefined
                  ? {}
                  : { title: options.title })}
              />
            </TooltipProvider>
          </ToastProvider>
        </DeviceProvider>
      ),
    }),
    history: createMemoryHistory(),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return seen
}

async function openAddMenu(): Promise<void> {
  fireEvent.mouseDown(
    await screen.findByRole("button", {
      name: new RegExp(t("field.asset.add.image")),
    })
  )
}

function photoTile(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    "[data-slot='drop-well'] [data-slot='media-tile']"
  )
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("the effects photo field", () => {
  it("offers a photo from your device or from your library", async () => {
    renderField({ first: [] })
    await openAddMenu()
    const items = await screen.findAllByRole("menuitem")
    expect(items.map((item) => item.textContent)).toEqual([
      t("field.asset.upload"),
      t("field.asset.fromLibrary"),
    ])
  })

  it("shows a photo picked from your library as a thumbnail in its own aspect ratio", async () => {
    renderField({ first: [] })
    await openAddMenu()
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: t("field.asset.fromLibrary"),
      })
    )
    fireEvent.click(
      await screen.findByRole("button", { name: t("library.tile.select") })
    )
    fireEvent.click(screen.getByRole("button", { name: t("field.asset.done") }))
    await waitFor(() => {
      expect(photoTile()?.style.aspectRatio).toBe("1200 / 1600")
    })
  })

  it("refuses a file from your device that is not an image, with the reason", async () => {
    const seen = renderField({
      first: [],
      picked: [new File(["notes"], "notes.txt", { type: "text/plain" })],
    })
    await openAddMenu()
    fireEvent.click(
      await screen.findByRole("menuitem", { name: t("field.asset.upload") })
    )
    await waitFor(() => {
      expect(seen.messages).toContain(
        t("field.asset.wrongKind", { kinds: t("apps.input.image") })
      )
    })
    expect(photoTile()).toBeNull()
  })

  it("keeps the formats, the 20 MB limit and the 480 px side out of the page until the well is hovered", async () => {
    renderField({ first: [] })
    const rules = tCatalog("effects.input.image.note", {
      size: formatBytes(20_000_000),
      min: 480,
    })
    const zone = await screen.findByRole("button", {
      name: new RegExp(t("field.asset.add.image")),
    })
    expect(screen.queryByText(rules)).toBeNull()
    expect(document.querySelector('[data-slot="field-note"]')).toBeNull()
    fireEvent.pointerEnter(zone, { pointerType: "mouse" })
    fireEvent.mouseEnter(zone)
    fireEvent.focus(zone)
    expect(await screen.findByText(rules, {}, { timeout: 3000 })).not.toBeNull()
  })

  it("names the photo the chosen effect needs in the empty well, in place of a second caption", async () => {
    renderField({ first: [], title: tCatalog("effects.photo.growGiant") })
    expect(
      await screen.findByRole("button", {
        name: tCatalog("effects.photo.growGiant"),
      })
    ).not.toBeNull()
  })

  it("shows a refusal in the note's place", async () => {
    const refusal = tCatalog("effects.input.image.tooSmall", {
      side: 320,
      min: 480,
    })
    renderField({ first: [photoId], message: refusal })
    expect(await screen.findByText(refusal)).not.toBeNull()
    expect(
      screen.queryByText(
        tCatalog("effects.input.image.note", {
          size: formatBytes(20_000_000),
          min: 480,
        })
      )
    ).toBeNull()
  })
})
