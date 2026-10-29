import { approvedExamples } from "@rosesfield/catalog/motion"
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

  it("finds Motion's graph for each approved example and your own video, and none for an example not offered", () => {
    expect(approvedExamples.length).toBeGreaterThan(0)
    for (const { id } of approvedExamples) {
      expect({
        id,
        workflow: workflowFor("motion", { example: id })?.id,
      }).toEqual({ id, workflow: "motion-guide-ltx-2-5" })
    }
    expect(workflowFor("motion", {})?.id).toBe("motion-guide-ltx-2-5")
    expect(workflowFor("motion", { model: "ltx-2-3-control" })?.id).toBe(
      "motion-ltx-2-3-ic-lora"
    )
    expect(workflowFor("motion", { example: "melt-away" })).toBeNull()
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
