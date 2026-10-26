import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { type AppListing, appListing, asset } from "@rosesfield/contract"
import { ToastProvider } from "@rosesfield/ui/components/toast"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  type RouterHistory,
  RouterProvider,
} from "@tanstack/react-router"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { GatewaySettings } from "@/api/gateway-settings"
import { assetQuery, runsQuery, settingsQuery } from "@/api/queries"
import { appName } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { t, tCatalog } from "@/copy/t"
import { modelCatalogQuery } from "@/screens/app/hosted/model-catalog-query"
import { AppScreen } from "@/studio/edit/screen"
import { assetIds } from "../../sample-app"
import { asPhone, resetFrames } from "../../screens/app/frame-render"

const [photo = ""] = assetIds

const settings: GatewaySettings = {
  mode: "owner",
  engine: {
    target: "comfy-cloud",
    address: null,
    key: "set",
    origin: "live",
  },
  lock: "local",
  keyFrom: "server",
  agent: "unknown",
  agentModel: null,
  place: "bun",
  retentionDays: null,
}

const photoInput = {
  type: "image",
  name: "image",
  labelKey: "relight.input.image.label",
  presence: "required",
  max: 1,
}

const promptInput = {
  type: "prompt",
  name: "prompt",
  labelKey: "relight.input.prompt.label",
  presence: "optional",
  maxLength: 300,
}

const clothesInput = {
  type: "image",
  name: "clothes",
  labelKey: "tryOn.input.clothes.label",
  presence: "required",
  max: 1,
}

function relight(
  inputs: readonly object[] = [photoInput, promptInput]
): AppListing {
  return appListing.parse({
    id: "relight",
    nameKey: "relight.name",
    category: "image",
    inputs,
    output: {
      kind: "image",
      count: { default: 1, max: 4 },
      aspectRatios: { options: ["1:1", "3:2", "2:3"], default: "1:1" },
    },
    limits: { timeoutSeconds: 600, maxRetries: 2 },
    preview: null,
  })
}

const ownCount: CatalogModel = {
  id: "kling/kling-image-o1",
  kind: "hosted",
  maker: "Kling",
  name: "Kling Image O1",
  nameKey: null,
  task: "image-edit",
  tags: [{ kind: "hosted" }],
  form: [
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: true,
      maxLength: null,
      default: null,
    },
    {
      kind: "media",
      name: "images",
      path: "images",
      required: true,
      media: "image",
      min: 1,
      max: 4,
    },
    {
      kind: "number",
      name: "n",
      path: "n",
      required: false,
      min: 1,
      max: 9,
      integer: true,
      default: 1,
    },
  ],
}

function openEdit(
  use: string | undefined,
  app: AppListing = relight(),
  models: readonly CatalogModel[] = []
): RouterHistory {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(settingsQuery.queryKey, settings)
  if (models.length > 0) {
    client.setQueryData(modelCatalogQuery(app.id, "set").queryKey, {
      models: [...models],
      defaultModel: models[0]?.id ?? null,
      refusal: null,
    })
  }
  client.setQueryData(runsQuery(app.id).queryKey, {
    pages: [{ runs: [], next: null }],
    pageParams: [null],
  })
  client.setQueryData(assetQuery(photo).queryKey, {
    asset: asset.parse({
      id: photo,
      kind: "image",
      mime: "image/png",
      bytes: 2_000_000,
      width: 1200,
      height: 800,
      durationSeconds: null,
      sourceRunId: null,
      createdAt: "2026-10-20T09:00:00.000Z",
    }),
  })
  const history = createMemoryHistory({ initialEntries: ["/apps/relight"] })
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <ToastProvider>
          <TooltipProvider>
            <AppScreen app={app} seeds={{ use, from: undefined }} />
          </TooltipProvider>
        </ToastProvider>
      ),
    }),
    history,
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return history
}

function nameOf(appId: string): string {
  const app = findCatalogApp(appId)
  return app === null ? appId : appName(app)
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  resetFrames()
})

describe("Edit opened at an old address", () => {
  it("titles the screen with the old address's tool, with no second row of tools", async () => {
    openEdit(undefined)
    await screen.findByRole("heading", { level: 1, name: nameOf("relight") })
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.queryByRole("tab", { name: nameOf("angles") })).toBeNull()
  })
})

describe("the photo on Edit's canvas", () => {
  it("shows the photo at its own width and height", async () => {
    openEdit(photo)
    const shown = await screen.findByRole("img", {
      name: t("viewer.compare.yours"),
    })
    expect(shown.closest("[data-slot='edit-photo']")).not.toBeNull()
    expect(shown.getAttribute("width")).toBe("1200")
    expect(shown.getAttribute("height")).toBe("800")
  })
})

describe("the settings bar", () => {
  it("is docked at the bottom edge of a phone screen, with the prompt and Generate", async () => {
    asPhone()
    openEdit(undefined)
    await screen.findByRole("textbox")
    expect(screen.queryAllByRole("heading", { level: 1 })).toHaveLength(0)
    const dock = document.querySelector("[data-slot='prompt-dock']")
    expect(dock?.getAttribute("data-place")).toBe("edge")
    expect(dock?.className).toContain("sticky")
    expect(dock?.className).toContain("bottom-0")
    expect(dock?.querySelector("textarea")).not.toBeNull()
    expect(dock?.textContent).toContain(t("run.generate"))
    const frame = document.querySelector("[data-slot='edit-frame']")
    expect(frame?.lastElementChild).toBe(dock)
  })

  it("says what is missing when you press Generate without a photo", async () => {
    openEdit(undefined)
    await screen.findByRole("heading", { level: 1, name: nameOf("relight") })
    const dock = document.querySelector("[data-slot='prompt-dock']")
    const generate = [...(dock?.querySelectorAll("button") ?? [])].find(
      (button) => button.textContent?.includes(t("run.generate")) === true
    )
    if (generate === undefined) {
      throw new Error("no Generate button")
    }
    fireEvent.click(generate)
    expect(await screen.findByText(t("field.asset.required"))).not.toBeNull()
  })

  it("draws no prompt field when the tool's run reads no prompt", async () => {
    openEdit(undefined, relight([photoInput]))
    await screen.findByRole("heading", { level: 1, name: nameOf("relight") })
    const dock = document.querySelector("[data-slot='prompt-dock']")
    expect(dock?.textContent).toContain(t("run.generate"))
    expect(dock?.querySelector("textarea")).toBeNull()
  })

  it("never marks a required second photo Optional", async () => {
    openEdit(undefined, relight([photoInput, clothesInput]))
    await screen.findByRole("heading", { level: 1, name: nameOf("relight") })
    const dock = document.querySelector("[data-slot='prompt-dock']")
    expect(dock?.textContent).toContain(tCatalog("tryOn.input.clothes.label"))
    expect(dock?.textContent).not.toContain(t("field.optional"))
  })

  it("draws one count stepper on a model that brings its own count, held to four", async () => {
    openEdit(undefined, relight(), [ownCount])
    const steppers = await screen.findAllByRole("group", {
      name: t("field.count.label"),
    })
    expect(steppers).toHaveLength(1)
    expect(steppers[0]?.textContent).toContain("1/4")
  })

  it("floats over the canvas on a wide screen", async () => {
    openEdit(undefined)
    await screen.findByRole("heading", { level: 1, name: nameOf("relight") })
    const dock = document.querySelector("[data-slot='prompt-dock']")
    expect(dock?.getAttribute("data-place")).toBe("float")
  })
})
