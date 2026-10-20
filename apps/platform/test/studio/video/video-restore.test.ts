import { findApp } from "@rosesfield/catalog"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { appListing } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { presetsOf } from "@/studio/video/video-prompt"
import { restoredOf } from "@/studio/video/video-restore"
import { minimaxH3 } from "./video-forms"

const presets = presetsOf("video")

const video = appListing.parse(findApp("video"))
const pushIn = "The camera moves slowly forward, toward the subject."

const graph: CatalogModel = {
  id: "ltx-2-5",
  kind: "graph",
  maker: "comfy-cloud",
  name: "LTX 2.5",
  nameKey: null,
  task: "text-to-video",
  tags: [],
  form: null,
}

const minimax: CatalogModel = {
  ...graph,
  id: "minimax/minimax-h3",
  kind: "hosted",
  form: [...minimaxH3],
}

describe("Use these inputs on Video", () => {
  it("writes a graph run's camera move under its prompt and sets the move to Auto", () => {
    expect(
      restoredOf(
        { model: "ltx-2-5", prompt: "A kite", cameraMove: "push-in" },
        graph,
        presets,
        video
      )
    ).toEqual({
      tab: "text-image",
      inputs: { prompt: `A kite\n${pushIn}`, cameraMove: "auto" },
    })
  })

  it("leaves a prompt that already holds the move's words", () => {
    expect(
      restoredOf(
        { model: "minimax/minimax-h3", prompt: `A kite\n${pushIn}` },
        minimax,
        presets,
        video
      ).inputs
    ).toEqual({})
  })

  it("opens the tab of the images the run holds", () => {
    expect(
      restoredOf(
        {
          model: "minimax/minimax-h3",
          prompt: "A kite",
          firstFrame: ["a"],
          lastFrame: ["b"],
        },
        minimax,
        presets,
        video
      ).tab
    ).toBe("first-last")
    expect(
      restoredOf(
        {
          model: "minimax/minimax-h3",
          prompt: "A kite",
          references: ["a", "b"],
        },
        minimax,
        presets,
        video
      ).tab
    ).toBe("references")
  })

  it("opens Two frames for a graph run that holds a first and a last frame", () => {
    expect(
      restoredOf(
        {
          model: "ltx-2-5",
          prompt: "A kite",
          startFrame: ["a"],
          lastFrame: ["b"],
        },
        graph,
        presets,
        video
      ).tab
    ).toBe("first-last")
  })
})
