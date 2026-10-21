import { describe, expect, it } from "vitest"
import {
  clipDefault,
  defaultsOfTab,
  featuredOf,
  formOfModel,
  lipFieldsOf,
  modelForTab,
  modelsOfTab,
  nearModels,
  tabOfInputs,
} from "@/studio/lipsync/lipsync-tabs"
import {
  avatar,
  catalog,
  clipId,
  lipSync,
  ltx,
  photoApp,
  seedance,
} from "./lipsync-models"

function idsOf(models: readonly { id: string }[]): string[] {
  return models.map((model) => model.id)
}

describe("the lip sync tabs", () => {
  it("list every lip sync model of the catalog that takes a photo in From a photo, and every one that takes a clip in From a clip, with no speech model", () => {
    expect(idsOf(modelsOfTab(catalog, "photo", photoApp))).toEqual([
      ltx.id,
      avatar.id,
      seedance.id,
    ])
    expect(idsOf(modelsOfTab(catalog, "clip", photoApp))).toEqual([
      lipSync.id,
      seedance.id,
    ])
  })

  it("open From a photo on the app's default graph and From a clip on Dreamina Seedance 2.5", () => {
    const photo = modelsOfTab(catalog, "photo", photoApp)
    const clip = modelsOfTab(catalog, "clip", photoApp)
    expect(
      modelForTab(photo, null, defaultsOfTab("photo", ltx.id))
    ).toBe(ltx.id)
    expect(modelForTab(clip, null, defaultsOfTab("clip", ltx.id))).toBe(
      clipDefault
    )
    expect(clipDefault).toBe(seedance.id)
  })

  it("keep the model you picked in a tab over the tab's default", () => {
    const photo = modelsOfTab(catalog, "photo", photoApp)
    expect(
      modelForTab(photo, avatar.id, defaultsOfTab("photo", ltx.id))
    ).toBe(avatar.id)
  })

  it("put Kling Avatar 2.0 and Kling Lip Sync first in the picker, one choice away, before the models you ran", () => {
    expect(featuredOf(catalog, [seedance.id])).toEqual([
      ...nearModels,
      seedance.id,
    ])
    expect(nearModels).toEqual([avatar.id, lipSync.id])
    expect(featuredOf([ltx], [])).toEqual([])
  })

  it("read each model's own inputs and length limit from its schema", () => {
    const own = lipFieldsOf(seedance.form ?? [])
    expect(own.photo?.name).toBe("referenceImages")
    expect(own.clip?.name).toBe("referenceVideos")
    expect(own.audio?.name).toBe("referenceAudios")
    expect(own.limit).toEqual({ min: 4, max: 15 })
    const graph = lipFieldsOf(formOfModel(ltx, photoApp) ?? [])
    expect(graph.photo?.name).toBe("photo")
    expect(graph.audio?.name).toBe("audio")
    expect(graph.clip).toBeNull()
    expect(graph.limit).toEqual({ min: 2, max: 10 })
    expect(lipFieldsOf(avatar.form ?? []).limit).toBeNull()
  })

  it("find the text a model speaks by itself, and leave a scene prompt alone", () => {
    expect(lipFieldsOf(lipSync.form ?? []).text?.name).toBe("text")
    expect(lipFieldsOf(avatar.form ?? []).text).toBeNull()
    expect(lipFieldsOf(seedance.form ?? []).text).toBeNull()
  })

  it("opens a run with a clip on From a clip", () => {
    const fields = lipFieldsOf(lipSync.form ?? [])
    expect(tabOfInputs({ video: [clipId] }, fields)).toBe("clip")
    expect(tabOfInputs({ video: [] }, fields)).toBe("photo")
  })
})
