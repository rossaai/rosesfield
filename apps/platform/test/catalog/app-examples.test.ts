import { templates } from "@rosesfield/catalog/ai-influencer"
import { exampleOf } from "@rosesfield/catalog/motion"
import { describe, expect, it } from "vitest"
import {
  appExamplesOf,
  draftOf,
  exampleDraftOf,
  examplesOf,
  templateExamplesOf,
} from "@/catalog/app-examples"
import { mediaOf } from "@/showcase/showcase"

describe("the examples an app's Library shows", () => {
  it("shows Motion's approved examples by their names and their results, with no hint about your photo and never their guides", () => {
    const shown = examplesOf("motion")
    expect(
      shown.map((example) => [example.id, example.name, example.line])
    ).toEqual([
      ["catch-the-truck", "Catch the truck", null],
      ["grab-and-run", "Grab and run", null],
    ])
    const [truck, grab] = shown
    expect(truck).toMatchObject({ aspect: { width: 1152, height: 2048 } })
    expect(truck?.src).toBe(mediaOf("catch-the-truck.mp4"))
    expect(grab).toMatchObject({ aspect: { width: 1152, height: 1792 } })
    expect(grab?.src).toBe(mediaOf("grab-and-run.mp4"))
    for (const example of shown) {
      expect(example.src).not.toMatch(/guides/)
    }
  })

  it("opens Catch the truck on your own video, with the clip its result was read from in the Video well and no photo, at its 1080p and the seed of the result it shows", () => {
    const clip = mediaOf("catch-the-truck-clip.mp4")
    expect(clip).not.toBeNull()
    expect(exampleDraftOf("motion", "catch-the-truck")).toEqual({
      prompt: "",
      assetIds: [],
      characterIds: [],
      inputs: { example: "own", model: "ltx-2-5-guide", resolution: "1080p" },
      seed: 20_261_103,
      input: { src: clip, name: "clip" },
    })
    expect(
      examplesOf("motion").find((one) => one.id === "catch-the-truck")?.draft
    ).toEqual(exampleDraftOf("motion", "catch-the-truck"))
  })

  it("falls back to the guided recipe when this build holds no clip for the example, the control", () => {
    const truck = exampleOf("catch-the-truck")
    const shownOnly = (file: string): string | null =>
      file === "catch-the-truck-clip.mp4" ? null : mediaOf(file)
    expect(draftOf(truck, ["1080p"], shownOnly)).toEqual({
      prompt: "",
      assetIds: [],
      characterIds: [],
      inputs: {
        example: "catch-the-truck",
        model: "ltx-2-5-guide",
        resolution: "1080p",
      },
      seed: 20_261_103,
    })
    expect(draftOf({ ...truck, clip: null }, ["1080p"]).input).toBeUndefined()
    expect(draftOf(truck, ["1080p"]).inputs?.example).toBe("own")
  })

  it("leaves out an example with no result this build holds, the control", () => {
    const grab = exampleOf("grab-and-run")
    expect(appExamplesOf([grab], () => null)).toEqual([])
    expect(appExamplesOf([exampleOf("ticket-wipe")])).toEqual([])
    expect(appExamplesOf([grab])).toHaveLength(1)
  })

  it("fills Motion with the example, its guided render, its 1080p and the seed of the result it shows, and with its resolution only where Motion offers it", () => {
    expect(exampleDraftOf("motion", "grab-and-run")).toEqual({
      prompt: "",
      assetIds: [],
      characterIds: [],
      inputs: {
        example: "grab-and-run",
        model: "ltx-2-5-guide",
        resolution: "1080p",
      },
      seed: 154_501_155,
    })
    expect(draftOf(exampleOf("grab-and-run"), ["480p", "720p"]).inputs).toEqual(
      { example: "grab-and-run", model: "ltx-2-5-guide" }
    )
    expect(exampleDraftOf("motion", "ticket-wipe")).toBeNull()
    expect(exampleDraftOf("video", "grab-and-run")).toBeNull()
    expect(examplesOf("video")).toEqual([])
  })
})

describe("AI Influencer's Library", () => {
  it("shows the four templates as stills from the runs that made them, each named and with the model that made it", () => {
    const shown = examplesOf("ai-influencer")
    expect(
      shown.map((example) => [example.id, example.name, example.line])
    ).toEqual([
      ["capybara", "Flat-top capybara", "Made with Z-Image Turbo"],
      ["absurd-man", "Soft-serve man", "Made with Z-Image Turbo"],
      ["frog", "Gold grill frog", "Made with Z-Image Turbo"],
      ["mantis", "Red beehive mantis", "Made with GPT Image 2.5 Sunburst"],
    ])
    for (const [index, example] of shown.entries()) {
      expect(example.kind).toBe("image")
      expect(example.src).toBe(mediaOf(templates[index]?.preview.file ?? ""))
    }
  })

  it("leaves out a template with no run this build shows, the control", () => {
    expect(templateExamplesOf(templates, [])).toEqual([])
  })

  it("leaves the template to the screen, so the form opens its model before the traits", () => {
    expect(exampleDraftOf("ai-influencer", "mantis")).toBeNull()
  })
})
