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
import { t } from "@/copy/t"
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
  retentionDays: null,
}

function relight(): AppListing {
  return appListing.parse({
    id: "relight",
    nameKey: "relight.name",
    category: "image",
    inputs: [
      {
        type: "image",
        name: "image",
        labelKey: "relight.input.image.label",
        presence: "required",
        max: 1,
      },
    ],
    output: {
      kind: "image",
      count: { default: 1, max: 4 },
      aspectRatios: { options: ["1:1", "3:2", "2:3"], default: "1:1" },
    },
    limits: { timeoutSeconds: 600, maxRetries: 2 },
    preview: null,
  })
}

function openEdit(use: string | undefined): RouterHistory {
  const app = relight()
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(settingsQuery.queryKey, settings)
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
  it("shows the tool row with the old address's tool chosen", async () => {
    openEdit(undefined)
    const relightTab = await screen.findByRole("tab", {
      name: nameOf("relight"),
    })
    expect(relightTab.getAttribute("aria-selected")).toBe("true")
    const angles = screen.getByRole("tab", { name: nameOf("angles") })
    expect(angles.getAttribute("aria-selected")).toBe("false")
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

  it("keeps the photo when you switch tools, by opening the next tool with it", async () => {
    const history = openEdit(photo)
    await screen.findByRole("img", { name: t("viewer.compare.yours") })
    fireEvent.click(screen.getByRole("tab", { name: nameOf("angles") }))
    await vi.waitFor(() => {
      expect(history.location.pathname).toBe("/apps/angles")
    })
    expect(history.location.search).toContain(photo)
  })
})

describe("the settings bar", () => {
  it("is docked at the bottom edge of a phone screen, with the prompt and Generate", async () => {
    asPhone()
    openEdit(undefined)
    await screen.findByRole("tab", { name: nameOf("relight") })
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
    await screen.findByRole("tab", { name: nameOf("relight") })
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

  it("floats over the canvas on a wide screen", async () => {
    openEdit(undefined)
    await screen.findByRole("tab", { name: nameOf("relight") })
    const dock = document.querySelector("[data-slot='prompt-dock']")
    expect(dock?.getAttribute("data-place")).toBe("float")
  })
})
