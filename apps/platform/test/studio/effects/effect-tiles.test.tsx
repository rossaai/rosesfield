import { type EffectRecipe, recipeOf } from "@rosesfield/catalog/effects"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { tCatalog } from "@/copy/t"
import { EffectTiles, effectGroups } from "@/studio/effects/effect-tiles"

const runId = "5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e"

function passed(effect: string, file: string): EffectRecipe {
  return {
    ...recipeOf(effect),
    review: "passed",
    credits: { "480p": { credits: 9.74, runId }, "720p": null },
    preview: {
      file,
      runId,
      seed: 7,
      resolution: "480p",
      aspectRatio: "9:16",
      workflowHash:
        "ed50011518009bb7519b8d93286267699aeb1c3863c4fe89c4ade3470cf8673f",
    },
  }
}

const recipes: readonly EffectRecipe[] = [
  passed("grow-wings", "grow-wings.mp4"),
  passed("melt-away", "melt-away.mp4"),
  recipeOf("pull-back-to-space"),
]

const previews = (file: string): string | null =>
  file === "grow-wings.mp4" ? "/previews/grow-wings.mp4" : null

function effectsApp() {
  const app = findCatalogApp("effects")
  if (app === null) {
    throw new Error("the catalog holds no effects app")
  }
  return app
}

afterEach(() => {
  cleanup()
})

describe("the effect tiles", () => {
  it("shows a passed effect with its run, hides one whose run file is missing, and keeps candidates in review", () => {
    const groups = effectGroups(effectsApp(), "480p", recipes, previews)
    expect(groups.shown.map((tile) => tile.effect)).toEqual(["grow-wings"])
    expect(groups.shown[0]).toMatchObject({
      preview: "/previews/grow-wings.mp4",
      credits: 9.74,
      label: tCatalog("effects.choice.effect.growWings"),
      photo: tCatalog("effects.photo.growWings"),
    })
    expect(groups.inReview.map((tile) => tile.effect)).toEqual([
      "pull-back-to-space",
    ])
  })

  it("reads the price at the chosen resolution and has none where no run measured it", () => {
    const groups = effectGroups(effectsApp(), "720p", recipes, previews)
    expect(groups.shown[0]?.credits).toBeNull()
  })

  it("plays the passed effect's run muted and picks an effect on a press", () => {
    const onChange = vi.fn()
    const { container } = render(
      <EffectTiles
        app={effectsApp()}
        value="pull-back-to-space"
        resolution="480p"
        onChange={onChange}
        register={() => undefined}
        recipes={recipes}
        previews={previews}
      />
    )
    const video = container.querySelector("video")
    expect(video?.getAttribute("src")).toBe("/previews/grow-wings.mp4")
    expect(video?.muted).toBe(true)
    expect(video?.loop).toBe(true)
    const wings = screen.getByRole("button", {
      name: new RegExp(tCatalog("effects.choice.effect.growWings")),
    })
    expect(wings.textContent).toContain("9.74")
    expect(wings.getAttribute("aria-pressed")).toBe("false")
    fireEvent.click(wings)
    expect(onChange).toHaveBeenCalledWith("grow-wings")
    const chosen = screen.getByRole("button", { pressed: true })
    expect(chosen.textContent).toContain(
      tCatalog("effects.choice.effect.pullBackToSpace")
    )
  })
})
