import { exampleOf } from "@rosesfield/catalog/motion"
import { describe, expect, it } from "vitest"
import {
  appExamplesOf,
  draftOf,
  exampleDraftOf,
  examplesOf,
} from "@/catalog/app-examples"
import { mediaOf } from "@/showcase/showcase"

describe("the examples an app's Library shows", () => {
  it("shows Motion's approved example by its name, its need and its result, never its guide", () => {
    const [grab, ...more] = examplesOf("motion")
    expect(more).toEqual([])
    expect(grab).toMatchObject({
      id: "grab-and-run",
      name: "Grab and run",
      aspect: { width: 1152, height: 1792 },
    })
    expect(grab?.src).toBe(mediaOf("grab-and-run.mp4"))
    expect(grab?.src).not.toMatch(/guides/)
  })

  it("leaves out an example with no result this build holds, the control", () => {
    const grab = exampleOf("grab-and-run")
    expect(appExamplesOf([grab], () => null)).toEqual([])
    expect(appExamplesOf([exampleOf("ticket-wipe")])).toEqual([])
    expect(appExamplesOf([grab])).toHaveLength(1)
  })

  it("fills Motion with the example, its guided render and its 1080p, and with its resolution only where Motion offers it", () => {
    expect(exampleDraftOf("motion", "grab-and-run")).toEqual({
      prompt: "",
      assetIds: [],
      characterIds: [],
      inputs: {
        example: "grab-and-run",
        model: "ltx-2-5-guide",
        resolution: "1080p",
      },
    })
    expect(draftOf(exampleOf("grab-and-run"), ["480p", "720p"]).inputs).toEqual(
      { example: "grab-and-run", model: "ltx-2-5-guide" }
    )
    expect(exampleDraftOf("motion", "ticket-wipe")).toBeNull()
    expect(exampleDraftOf("video", "grab-and-run")).toBeNull()
    expect(examplesOf("video")).toEqual([])
  })
})
