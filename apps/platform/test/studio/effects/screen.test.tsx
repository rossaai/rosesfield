import {
  type EffectRecipe,
  effectRecipes,
  effectsApp,
} from "@rosesfield/catalog/effects"
import {
  type AppListing,
  appDefinition,
  appListing,
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
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { GatewaySettings } from "@/api/gateway-settings"
import { runsQuery, settingsQuery } from "@/api/queries"
import { t, tCatalog } from "@/copy/t"
import {
  liveSettings,
  publicSettingsOf,
} from "@/gallery/screens/screen-fixtures"
import { AskedTab } from "@/screens/app/app-stage"
import { noSeeds } from "@/screens/app/use-app-screen"
import { AppScreen } from "@/studio/effects/screen"
import { asPhone, resetFrames, stubFetch } from "../../screens/app/frame-render"

const { held, heldRecipe } = vi.hoisted(() => ({
  held: ["grow-giant", "many-copies", "melt-away"],
  heldRecipe: (recipe: EffectRecipe, isHeld: boolean): EffectRecipe =>
    isHeld
      ? {
          ...recipe,
          passed: true,
          preview: {
            file: `${recipe.effect}.mp4`,
            runId: "5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e",
            seed: 7,
            resolution: "480p",
            aspectRatio: "9:16",
            workflowHash:
              "ed50011518009bb7519b8d93286267699aeb1c3863c4fe89c4ade3470cf8673f",
          },
        }
      : { ...recipe, passed: false, preview: null },
}))

vi.mock("@rosesfield/catalog/effects", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@rosesfield/catalog/effects")>()
  return {
    ...actual,
    effectRecipes: actual.effectRecipes.map((recipe) =>
      heldRecipe(recipe, held.includes(recipe.effect))
    ),
  }
})

vi.mock("@/studio/effects/effect-previews", () => ({
  previewOf: (file: string) => `/previews/${file}`,
}))

const localSettings: GatewaySettings = { ...liveSettings, lock: "local" }

function shippedApp(
  offered: readonly EffectRecipe[] = effectRecipes.filter(
    (recipe) => recipe.passed
  )
): AppListing {
  return appListing.parse(appDefinition.parse(effectsApp(offered)))
}

function openEffects(
  settings: GatewaySettings = liveSettings,
  app: AppListing = shippedApp()
): void {
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
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <ToastProvider>
          <TooltipProvider>
            <AskedTab tab="history">
              <AppScreen app={app} seeds={noSeeds} />
            </AskedTab>
          </TooltipProvider>
        </ToastProvider>
      ),
    }),
    history: createMemoryHistory(),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

async function openSheet(): Promise<void> {
  fireEvent.click(
    await screen.findByRole("button", { name: t("app.empty.action") })
  )
  await screen.findByRole("dialog")
}

function tilesShown(): (string | null)[] {
  return Array.from(
    sheetPart("sheet-body").querySelectorAll("[data-effect]")
  ).map((tile) => tile.getAttribute("data-effect"))
}

function sheetPart(slot: string): HTMLElement {
  const part = document.querySelector<HTMLElement>(`[data-slot='${slot}']`)
  if (part === null) {
    throw new Error(`the input sheet has no ${slot}`)
  }
  return part
}

beforeEach(() => {
  stubFetch()
  asPhone()
})

afterEach(() => {
  cleanup()
  resetFrames()
})

describe("Effects on a phone", () => {
  it("puts the held effects in 2 columns in the input sheet, with Generate in the sheet's foot at its bottom edge", async () => {
    openEffects()
    await openSheet()
    const body = sheetPart("sheet-body")
    const tiles = body.querySelector<HTMLElement>(
      `ul[aria-label='${tCatalog("effects.input.effect.label")}']`
    )
    expect(tiles?.className.split(" ")).toEqual(
      expect.arrayContaining(["grid", "grid-cols-2"])
    )
    expect(
      Array.from(tiles?.querySelectorAll("[data-effect]") ?? []).map((tile) =>
        tile.getAttribute("data-effect")
      )
    ).toEqual(held)
    const foot = sheetPart("sheet-footer")
    expect(foot.querySelector("[data-slot='generate-button']")).not.toBeNull()
    expect(body.querySelector("[data-slot='generate-button']")).toBeNull()
    const sheet = foot.closest("[data-slot='sheet-content']")
    expect(sheet?.getAttribute("data-side")).toBe("bottom")
    expect(foot.className.split(" ")).toEqual(
      expect.arrayContaining(["mt-auto", "shrink-0"])
    )
    expect(
      body.compareDocumentPosition(foot) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
})

describe("Effects drafts", () => {
  it("shows only the judged looks on a server that answers only on this computer, and no tile reads Draft", async () => {
    openEffects(localSettings)
    await openSheet()
    expect(tilesShown()).toEqual(held)
    expect(sheetPart("sheet-body").textContent).not.toContain(
      tCatalog("effects.draft")
    )
  })

  it("opens Effects on a local server while the shipped app is closed", async () => {
    openEffects(localSettings, shippedApp([]))
    await openSheet()
    expect(tilesShown()).toEqual(held)
  })

  it.each([
    ["an owner token", liveSettings],
    ["public mode", publicSettingsOf(true)],
  ])("shows only the passed looks behind %s", async (_, settings) => {
    openEffects(settings)
    await openSheet()
    expect(tilesShown()).toEqual(held)
  })

  it.each([
    ["an owner token", liveSettings],
    ["public mode", publicSettingsOf(true)],
  ])("stays closed behind %s while no look has passed", async (_, settings) => {
    openEffects(settings, shippedApp([]))
    expect(await screen.findByText(tCatalog("effects.closed"))).not.toBeNull()
    expect(
      screen.queryByRole("button", { name: t("app.empty.action") })
    ).toBeNull()
  })
})

describe("the Effects column", () => {
  it("shows the format, then the resolution as a row, with the seed closed under Advanced", async () => {
    openEffects()
    await openSheet()
    const body = sheetPart("sheet-body")
    const format = screen.getByText(tCatalog("effects.input.aspect.label"))
    const resolution = screen.getByText(
      tCatalog("effects.input.resolution.label")
    )
    const advanced = screen.getByRole("button", { name: t("field.advanced") })
    expect(
      format.compareDocumentPosition(resolution) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      resolution.compareDocumentPosition(advanced) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(body.textContent).not.toContain(tCatalog("effects.input.seed.label"))
  })
})
