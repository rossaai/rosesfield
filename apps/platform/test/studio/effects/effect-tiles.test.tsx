import {
  type EffectRecipe,
  type EffectRun,
  effectRecipes,
  effectRuns,
  effectsApp,
  passedRecipes,
  recipeOf,
} from "@rosesfield/catalog/effects"
import {
  type AppListing,
  appDefinition,
  appListing,
} from "@rosesfield/contract"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { t, tCatalog } from "@/copy/t"
import { EffectTiles, effectTiles } from "@/studio/effects/effect-tiles"
import type { EffectPrices } from "@/studio/effects/use-effect-prices"

const runId = "5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e"

function passed(effect: string): EffectRecipe {
  return {
    ...recipeOf(effect),
    passed: true,
    preview: {
      file: `${effect}.mp4`,
      runId,
      seed: 7,
      resolution: "480p",
      aspectRatio: "9:16",
      workflowHash:
        "ed50011518009bb7519b8d93286267699aeb1c3863c4fe89c4ade3470cf8673f",
    },
  }
}

const recipes = [passed("grow-giant"), passed("melt-away")]

function listingOf(offered: readonly EffectRecipe[]): AppListing {
  return appListing.parse(appDefinition.parse(effectsApp(offered)))
}

const previews = (file: string): string | null =>
  ["grow-giant.mp4", "melt-away.mp4", "many-copies.mp4"].includes(file)
    ? `/previews/${file}`
    : null

const noPrices: EffectPrices = {
  isDemo: false,
  creditsOf: () => null,
  isMeasured: () => false,
}

const keptRun: EffectRun = {
  runId,
  effect: "melt-away",
  workflowHash:
    "ed50011518009bb7519b8d93286267699aeb1c3863c4fe89c4ade3470cf8673f",
  photo: "4878911303dc844df9d1380ef667e54c3bbc27d0a634396496d961404542b221",
  seed: 7,
  resolution: "480p",
  aspectRatio: "9:16",
  balance: { before: 2530.78, after: 2492.89 },
  verdict: "kept",
  failed: [],
}

function renderTiles(
  value = "grow-giant",
  prices: EffectPrices = noPrices,
  runs: readonly EffectRun[] = []
): void {
  render(
    <EffectTiles
      app={listingOf(recipes)}
      value={value}
      prices={prices}
      runs={runs}
      onChange={() => undefined}
      register={() => undefined}
      recipes={recipes}
      previews={previews}
    />
  )
}

function tileNamed(effect: string): HTMLElement {
  const key = effect === "grow-giant" ? "growGiant" : "meltAway"
  return screen.getByRole("button", {
    name: new RegExp(tCatalog(`effects.choice.effect.${key}`)),
  })
}

afterEach(() => {
  cleanup()
})

describe("the effect tiles", () => {
  it("shows each effect the app offers with its run, and none whose run file is missing", () => {
    const tiles = effectTiles(listingOf(recipes), recipes, (file) =>
      file === "grow-giant.mp4" ? "/previews/grow-giant.mp4" : null
    )
    expect(tiles).toEqual([
      {
        effect: "grow-giant",
        label: tCatalog("effects.choice.effect.growGiant"),
        photo: tCatalog("effects.photo.growGiant"),
        preview: "/previews/grow-giant.mp4",
        kept: null,
      },
    ])
  })

  it("shows no tile while the app offers no effect, whatever the recipes say", () => {
    const closed = listingOf([])
    expect(closed.closedKey).toBe("effects.closed")
    expect(effectTiles(closed, recipes, previews)).toEqual([])
  })

  it("shows each passed look as a tile of the shipped app, each playing its own kept run", () => {
    const shipped = findCatalogApp("effects")
    if (shipped === null) {
      throw new TypeError("The catalog lacks Effects")
    }
    const tiles = effectTiles(shipped, effectRecipes)
    expect(passedRecipes.length).toBeGreaterThan(0)
    expect(tiles).toEqual(
      passedRecipes.map(({ effect }) =>
        expect.objectContaining({
          effect,
          preview: expect.stringContaining(`${effect}.mp4`),
        })
      )
    )
    const loops = tiles.map((tile) => tile.preview)
    expect(new Set(loops).size).toBe(passedRecipes.length)
  })

  it("shows the credits its kept run measured on the clip, named as measured on that run's resolution, until your own run measures it", () => {
    const kept = t("run.price.kept", { amount: "38", resolution: "480p" })
    renderTiles("grow-giant", noPrices, [keptRun])
    const badge = tileNamed("grow-giant").querySelector<HTMLElement>(
      "[data-slot=effect-price]"
    )
    expect(badge?.getAttribute("title")).toBe(kept)
    expect(badge?.textContent).toContain("38")
    expect(badge?.textContent).toContain(kept)
    expect(badge?.closest("[data-slot=effect-clip]")).not.toBeNull()
    cleanup()
    renderTiles(
      "grow-giant",
      { isDemo: false, creditsOf: () => 41.2, isMeasured: () => true },
      [keptRun]
    )
    const own = tileNamed("grow-giant").querySelector<HTMLElement>(
      "[data-slot=effect-price]"
    )
    expect(own?.getAttribute("title")).toBe(
      t("run.price.credits", { amount: "41" })
    )
    expect(document.body.textContent).not.toContain(kept)
  })

  it("shows no price, never Price unknown, where no run measured one", () => {
    renderTiles("grow-giant", noPrices, [])
    expect(document.querySelector("[data-slot=effect-price]")).toBeNull()
    expect(document.body.textContent).not.toContain(t("run.price.unknown"))
  })

  it("prices each shipped look from its own kept run in the run ledger", () => {
    const shipped = findCatalogApp("effects")
    if (shipped === null) {
      throw new TypeError("The catalog lacks Effects")
    }
    const tiles = effectTiles(shipped, effectRecipes)
    for (const tile of tiles) {
      const recipe = passedRecipes.find((one) => one.effect === tile.effect)
      const run = effectRuns.find((one) => one.runId === recipe?.preview?.runId)
      expect(run).toBeDefined()
      expect(tile.kept).toEqual({
        credits:
          Math.round(
            ((run?.balance.before ?? 0) - (run?.balance.after ?? 0)) * 100
          ) / 100,
        resolution: run?.resolution,
      })
      expect(tile.kept?.credits).toBeGreaterThan(0)
    }
  })

  it("shows each tile as its clip in one 3:4 frame the clip covers and its name, with no count or second caption line", () => {
    renderTiles()
    const tile = tileNamed("grow-giant")
    expect(tile.textContent).toBe(tCatalog("effects.choice.effect.growGiant"))
    const frames = [
      ...document.querySelectorAll<HTMLElement>("[data-slot=effect-clip]"),
    ]
    expect(frames.length).toBeGreaterThan(0)
    for (const frame of frames) {
      expect(frame.className.split(" ")).toContain("aspect-3/4")
      expect(frame.style.aspectRatio).toBe("")
      expect(frame.querySelector("video")?.className.split(" ")).toContain(
        "object-cover"
      )
    }
  })

  it("keeps the photo hint out of the grid, because the photo well names it", () => {
    renderTiles("melt-away")
    expect(document.querySelector("[data-slot=effect-hint]")).toBeNull()
    expect(screen.queryByText(tCatalog("effects.photo.meltAway"))).toBeNull()
  })

  it("veils the chosen tile's clip with the selection tint and an ink ring", () => {
    renderTiles("melt-away")
    const veil = (effect: string) =>
      tileNamed(effect).querySelector("[data-slot=chosen-veil]")
    expect(veil("melt-away")?.getAttribute("data-chosen")).toBe("yes")
    expect(veil("grow-giant")?.getAttribute("data-chosen")).toBe("no")
    expect(veil("melt-away")?.className).toContain(
      "data-[chosen=yes]:bg-selection"
    )
    expect(veil("melt-away")?.className).toContain("data-[chosen=yes]:ring-ink")
  })

  it("plays each effect's run muted and picks an effect on a press", () => {
    const onChange = vi.fn()
    const { container } = render(
      <EffectTiles
        app={listingOf(recipes)}
        value="melt-away"
        prices={noPrices}
        onChange={onChange}
        register={() => undefined}
        recipes={recipes}
        previews={previews}
      />
    )
    const video = container.querySelector("video")
    expect(video?.getAttribute("src")).toBe("/previews/grow-giant.mp4")
    expect(video?.muted).toBe(true)
    expect(video?.loop).toBe(true)
    expect(tileNamed("grow-giant").getAttribute("aria-pressed")).toBe("false")
    fireEvent.click(tileNamed("grow-giant"))
    expect(onChange).toHaveBeenCalledWith("grow-giant")
    expect(tileNamed("melt-away").getAttribute("aria-pressed")).toBe("true")
  })

  it("leaves an offered effect with no judged preview out of the grid, so no tile reads Draft", () => {
    const offered = [
      ...recipes,
      { ...passed("many-copies"), passed: false },
      recipeOf("pull-back-to-space"),
    ]
    const tiles = effectTiles(listingOf(offered), offered, previews)
    expect(tiles.map((tile) => tile.effect)).toEqual([
      "grow-giant",
      "melt-away",
    ])
    render(
      <EffectTiles
        app={listingOf(offered)}
        value="grow-giant"
        prices={noPrices}
        onChange={() => undefined}
        register={() => undefined}
        recipes={offered}
        previews={previews}
      />
    )
    expect(document.body.textContent).not.toContain(tCatalog("effects.draft"))
  })

  it("shows no draft the app does not offer", () => {
    const tiles = effectTiles(
      listingOf(recipes),
      [...recipes, recipeOf("many-copies")],
      previews
    )
    expect(tiles.map((tile) => tile.effect)).toEqual([
      "grow-giant",
      "melt-away",
    ])
  })
})
