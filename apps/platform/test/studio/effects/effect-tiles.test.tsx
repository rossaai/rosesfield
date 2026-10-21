import {
  type EffectRecipe,
  effectRecipes,
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
  file === "grow-giant.mp4" || file === "melt-away.mp4"
    ? `/previews/${file}`
    : null

const prices: EffectPrices = {
  isDemo: false,
  creditsOf: (effect) => (effect === "grow-giant" ? 6.95 : null),
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
        look: { status: "passed", preview: "/previews/grow-giant.mp4" },
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
          look: {
            status: "passed",
            preview: expect.stringContaining(`${effect}.mp4`),
          },
        })
      )
    )
    const loops = tiles.map((tile) =>
      tile.look.status === "passed" ? tile.look.preview : null
    )
    expect(new Set(loops).size).toBe(passedRecipes.length)
  })

  it("shows the price the price route measured in Comfy credits, and says when there is none", () => {
    render(
      <EffectTiles
        app={listingOf(recipes)}
        value="grow-giant"
        prices={prices}
        onChange={() => undefined}
        register={() => undefined}
        recipes={recipes}
        previews={previews}
      />
    )
    expect(tileNamed("grow-giant").textContent).toContain(
      t("run.price.credits", { amount: "6.95" })
    )
    expect(tileNamed("melt-away").textContent).toContain(t("run.price.unknown"))
  })

  it("plays each effect's run muted and picks an effect on a press", () => {
    const onChange = vi.fn()
    const { container } = render(
      <EffectTiles
        app={listingOf(recipes)}
        value="melt-away"
        prices={prices}
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

  it("marks an offered effect that has not passed as a draft, with no run to play", () => {
    const offered = [...recipes, recipeOf("many-copies")]
    const tiles = effectTiles(listingOf(offered), offered, previews)
    expect(tiles.map((tile) => [tile.effect, tile.look.status])).toEqual([
      ["grow-giant", "passed"],
      ["melt-away", "passed"],
      ["many-copies", "draft"],
    ])
    render(
      <EffectTiles
        app={listingOf(offered)}
        value="grow-giant"
        prices={prices}
        onChange={() => undefined}
        register={() => undefined}
        recipes={offered}
        previews={previews}
      />
    )
    const draft = screen.getByRole("button", {
      name: new RegExp(tCatalog("effects.choice.effect.manyCopies")),
    })
    expect(draft.getAttribute("data-look")).toBe("draft")
    expect(draft.textContent).toContain(tCatalog("effects.draft"))
    expect(draft.querySelector("video")).toBeNull()
    expect(tileNamed("grow-giant").textContent).not.toContain(
      tCatalog("effects.draft")
    )
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
