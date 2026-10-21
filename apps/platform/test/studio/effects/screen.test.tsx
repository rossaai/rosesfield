import {
  type EffectRecipe,
  effectRecipes,
  effectsApp,
} from "@rosesfield/catalog/effects"
import { appDefinition, appListing } from "@rosesfield/contract"
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
import { runsQuery, settingsQuery } from "@/api/queries"
import { t, tCatalog } from "@/copy/t"
import { liveSettings } from "@/gallery/screens/screen-fixtures"
import { noSeeds } from "@/screens/app/use-app-screen"
import { AppScreen } from "@/studio/effects/screen"
import { asPhone, resetFrames, stubFetch } from "../../screens/app/frame-render"

const { held, heldRecipe } = vi.hoisted(() => ({
  held: ["grow-wings", "liquid-metal", "melt-away"],
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

function openEffects(): void {
  const offered = effectRecipes.filter((recipe) => recipe.passed)
  const app = appListing.parse(appDefinition.parse(effectsApp(offered)))
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(settingsQuery.queryKey, liveSettings)
  client.setQueryData(runsQuery(app.id).queryKey, {
    pages: [{ runs: [], next: null }],
    pageParams: [null],
  })
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <ToastProvider>
          <TooltipProvider>
            <AppScreen app={app} seeds={noSeeds} />
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
    fireEvent.click(
      await screen.findByRole("button", { name: t("app.empty.action") })
    )
    await screen.findByRole("dialog")
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
