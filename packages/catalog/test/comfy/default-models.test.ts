import { isHostedModelId } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { defaultModelOf, isOpenWeights, modelsForApp } from "#comfy/list-models"
import { findApp, listApps } from "#list-apps"

const taskApps = listApps().filter((app) => defaultModelOf(app) !== null)

describe("the model each app opens on", () => {
  it("is held by at least the Image and the Video apps", () => {
    expect(taskApps.map((app) => app.id)).toEqual(
      expect.arrayContaining(["image", "video"])
    )
  })

  it.each(taskApps.map((app) => ({ id: app.id, app })))(
    "$id opens on one of its own open-weights graphs, so a run with the defaults calls no hosted model",
    ({ app }) => {
      const opened = defaultModelOf(app) ?? ""
      expect(isHostedModelId(opened)).toBe(false)
      const listed = modelsForApp(app, []).find((one) => one.id === opened)
      expect(listed?.kind).toBe("graph")
      expect(listed !== undefined && isOpenWeights(listed)).toBe(true)
    }
  )

  it("opens Image on the open-weights graph ranked highest on its board, citing the board and the date it was read", () => {
    const image = findApp("image")
    if (image === null) {
      throw new Error("the catalog lacks Image")
    }
    const ranked = modelsForApp(image, []).flatMap((model) => {
      const rank = model.facts?.rank ?? null
      return rank === null ? [] : [{ id: model.id, rank }]
    })
    const best = [...ranked].sort((a, b) => a.rank.position - b.rank.position)
    expect(best[0]?.id).toBe(defaultModelOf(image))
    expect(best[0]?.rank).toMatchObject({
      board: "Artificial Analysis Text to Image Arena",
      readOn: "2026-10-20",
    })
    expect(best.map((one) => one.id)).toContain("z-image-turbo")
  })
})
