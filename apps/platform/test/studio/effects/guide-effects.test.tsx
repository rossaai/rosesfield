import {
  type EffectPreset,
  effectKeyOf,
  effectsApp,
  heldEffectPresets,
  passedRecipes,
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

const runId = "5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e"

const kept: readonly EffectPreset[] = heldEffectPresets.map((preset) => ({
  ...preset,
  result: { runId, file: `${preset.id}.mp4` },
}))

function appWith(presets: readonly EffectPreset[]): AppListing {
  return appListing.parse(
    appDefinition.parse(effectsApp(passedRecipes, presets))
  )
}

const previews = (file: string): string => `/previews/${file}`

describe("an effect built on a guide", () => {
  it("is left out of Effects while no kept result exists", () => {
    const app = appWith(heldEffectPresets)
    const shown = effectTiles(app, undefined, previews, [], heldEffectPresets)
    for (const preset of heldEffectPresets) {
      expect(shown.map((tile) => tile.effect)).not.toContain(preset.id)
    }
  })

  it("shows its kept result, its name and its use once it has one, in Effects' own tile", () => {
    const tiles = effectTiles(appWith(kept), undefined, previews, [], kept)
    const tile = tiles.find((one) => one.effect === "grab-and-run")
    expect(tile).toEqual({
      effect: "grab-and-run",
      label: tCatalog("effects.choice.effect.grabAndRun"),
      photo: tCatalog("effects.photo.grabAndRun"),
      preview: "/previews/grab-and-run.mp4",
      kept: null,
    })
  })

  it("names no engine in its name or its use", () => {
    for (const preset of heldEffectPresets) {
      const words = tCatalog(`effects.choice.effect.${effectKeyOf(preset.id)}`)
      expect(words).not.toMatch(/depth|guide|adapter|LoRA|LTX|preset/i)
    }
  })
})

describe("the photo a guide effect takes", () => {
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

  it("checks no shape for an effect of the house's own recipes", () => {
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
