import { describe, expect, it } from "vitest"
import { sampleOf, shownPresets } from "@/studio/video/preset-samples"
import {
  composePrompt,
  movedPrompt,
  presetsOf,
  splitPrompt,
  typedPrompt,
} from "@/studio/video/video-prompt"

const presets = presetsOf("video")
const pushIn = "The camera moves slowly forward, toward the subject."
const hold = "The camera holds still for the whole shot."

describe("the camera moves of Video", () => {
  it("reads every move of the definition with its words, and no Auto", () => {
    expect(presets.map((one) => one.value)).toEqual([
      "static",
      "push-in",
      "pull-out",
      "track-left",
      "track-right",
      "crane-up",
      "crane-down",
    ])
    expect(presets.find((one) => one.value === "push-in")?.words).toBe(pushIn)
  })

  it("adds a move's words under the prompt and reads them back", () => {
    const prompt = composePrompt("A kite over a hill", "push-in", presets)
    expect(prompt).toBe(`A kite over a hill\n${pushIn}`)
    expect(splitPrompt(prompt, presets)).toEqual({
      typed: "A kite over a hill",
      move: "push-in",
    })
    expect(splitPrompt("A kite over a hill", presets).move).toBeNull()
    expect(composePrompt("A kite", null, presets)).toBe("A kite")
  })

  it("keeps the move while you type, and takes the move whose words you type", () => {
    const current = `A kite\n${hold}`
    expect(typedPrompt(current, "A red kite", presets)).toBe(
      `A red kite\n${hold}`
    )
    expect(typedPrompt(current, `A red kite\n${pushIn}`, presets)).toBe(
      `A red kite\n${pushIn}`
    )
  })

  it("moves a run's camera input into its prompt once", () => {
    expect(movedPrompt("A kite", "push-in", presets)).toBe(`A kite\n${pushIn}`)
    expect(movedPrompt(`A kite\n${hold}`, "push-in", presets)).toBe(
      `A kite\n${hold}`
    )
    expect(movedPrompt("A kite", "auto", presets)).toBe("A kite")
  })

  it("shows a move only when a real run's loop is in the presets folder", () => {
    const files = { "./presets/static.mp4": "/static.mp4" }
    expect(shownPresets(presets, files).map((one) => one.value)).toEqual([
      "static",
    ])
    expect(sampleOf("push-in", files)).toBeNull()
    expect(shownPresets(presets).map((one) => one.value)).toEqual([
      "static",
      "push-in",
    ])
  })
})
