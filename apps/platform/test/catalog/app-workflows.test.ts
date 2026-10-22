import { passedRecipes } from "@rosesfield/catalog/effects"
import { describe, expect, it } from "vitest"
import { outputKindsOf, workflowFor } from "@/catalog/app-workflows"
import { findCatalogApp } from "@/catalog/catalog-apps"

describe("workflowFor", () => {
  it("finds the workflow the app binds for the model a run chose", () => {
    expect(
      workflowFor("image", { prompt: "A cup", model: "z-image-turbo" })?.id
    ).toBe("image-z-image-turbo")
    expect(
      workflowFor("image", { prompt: "A cup", model: "qwen-image-2512" })?.id
    ).toBe("image-qwen-image-2512")
  })

  it("follows the mode to the workflow of that mode", () => {
    const image = workflowFor("upscale", { mode: "image" })
    const video = workflowFor("upscale", { mode: "video" })
    expect(image?.id).toMatch(/^upscale-image-/)
    expect(video?.id).toMatch(/^upscale-video-/)
  })

  it("finds the Effects graph for each passed effect, and none for a draft", () => {
    expect(findCatalogApp("effects")?.closedKey).toBeNull()
    expect(passedRecipes.length).toBeGreaterThan(0)
    for (const { effect } of passedRecipes) {
      expect({
        effect,
        workflow: workflowFor("effects", { effect })?.id,
      }).toEqual({ effect, workflow: "effects-ltx-2-5" })
    }
    expect(workflowFor("effects", { effect: "melt-away" })).toBeNull()
  })

  it("follows a Video run with a start frame through every nested choice to the start frame graph", () => {
    const startFrame = ["a633abb1-83d6-4051-a32e-90baad7f1d29"]
    expect(
      workflowFor("video", {
        prompt: "The old man looks into the camera",
        startFrame,
        lastFrame: [],
        model: "ltx-2-5",
        resolution: "720p",
        sound: "off",
      })?.id
    ).toBe("video-ltx-2-5-start-frame")
    expect(
      workflowFor("video", {
        prompt: "A field at dusk",
        startFrame,
        lastFrame: startFrame,
        model: "ltx-2-5",
      })?.id
    ).toBe("video-ltx-2-5-start-frame")
  })

  it("names no workflow for an app the catalog does not hold", () => {
    expect(workflowFor("no-such-app", {})).toBeNull()
  })
})

describe("outputKindsOf", () => {
  it("names each kind the modes of an app make", () => {
    const upscale = findCatalogApp("upscale")
    const lipsync = findCatalogApp("lipsync")
    expect(upscale === null ? [] : outputKindsOf(upscale)).toEqual([
      "image",
      "video",
    ])
    expect(lipsync === null ? [] : outputKindsOf(lipsync)).toEqual(["video"])
  })
})
