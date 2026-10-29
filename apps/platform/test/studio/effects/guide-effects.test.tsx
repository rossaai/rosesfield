import {
  type EffectRecipe,
  effectKeyOf,
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
import { describe, expect, it } from "vitest"
import { appBadge } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { tCatalog } from "@/copy/t"
import { effectTiles } from "@/studio/effects/effect-tiles"
import { photoShapeMessage } from "@/studio/effects/photo-shape"

const guided = effectRecipes.filter((recipe) => recipe.guide !== null)

function passedLook(effect: string): EffectRecipe {
  const [passed] = passedRecipes
  if (passed?.preview === null || passed === undefined) {
    throw new Error("No look passed")
  }
  return {
    ...recipeOf(effect),
    passed: true,
    preview: { ...passed.preview, file: `${effect}.mp4` },
    proof: passed.proof,
  }
}

function appOf(recipes: readonly EffectRecipe[]): AppListing {
  return appListing.parse(appDefinition.parse(effectsApp(recipes)))
}

const previews = (file: string): string => `/previews/${file}`

describe("a look that follows a guide", () => {
  it("is left out of Effects while no run of it passed with a judge's proof", () => {
    const tiles = effectTiles(appOf(guided), guided, previews, [])
    expect(tiles).toEqual([])
  })

  it("shows its kept result, its name and its use in Effects' own tile once one passed", () => {
    const kept = passedLook("grab-and-run")
    const tile = effectTiles(appOf([kept]), [kept], previews, []).find(
      (one) => one.effect === "grab-and-run"
    )
    expect(tile).toMatchObject({
      label: tCatalog("effects.choice.effect.grabAndRun"),
      photo: tCatalog("effects.photo.grabAndRun"),
      preview: "/previews/grab-and-run.mp4",
    })
  })

  it("names no engine in its name or its use", () => {
    for (const recipe of guided) {
      const key = effectKeyOf(recipe.effect)
      const words = `${tCatalog(`effects.choice.effect.${key}`)} ${tCatalog(`effects.photo.${key}`)}`
      expect(words).not.toMatch(/depth|guide|adapter|LoRA|LTX|preset/i)
    }
  })
})

describe("the photo a guide look takes", () => {
  it("passes a photo in the guide's shape", () => {
    expect(
      photoShapeMessage("grab-and-run", { width: 1080, height: 1920 }, "720p")
    ).toBeNull()
  })

  it("refuses a photo in another shape with one plain sentence about the photo", () => {
    expect(
      photoShapeMessage("grab-and-run", { width: 1920, height: 1080 }, "720p")
    ).toBe(tCatalog("effects.input.image.tall"))
    expect(
      photoShapeMessage("ticket-wipe", { width: 1080, height: 1920 }, "720p")
    ).toBe(tCatalog("effects.input.image.wide"))
  })

  it("checks no shape for a look with no guide", () => {
    expect(
      photoShapeMessage("push-into-eye", { width: 1920, height: 1080 }, "720p")
    ).toBeNull()
  })
})

describe("the engine badge", () => {
  it("shows beside Effects and no other app", () => {
    const effects = findCatalogApp("effects")
    const image = findCatalogApp("image")
    expect(effects === null ? null : appBadge(effects)).toBe(
      tCatalog("effects.badge")
    )
    expect(image === null ? "" : appBadge(image)).toBeNull()
  })
})
