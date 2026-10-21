import { describe, expect, it } from "vitest"
import { bodyOf, defaultsOf, problemsOf } from "@/screens/app/app-form"
import {
  bodyAppFor,
  formAppFor,
  panelInputsOf,
  recordingLengthProblem,
  recordingOf,
} from "@/studio/audio/audio-modes"
import { audioListing } from "./audio-app"

const audio = audioListing()

function namesOf(inputs: readonly { name: string }[]): string[] {
  return inputs.map((input) => input.name)
}

describe("the inputs of each Audio tab", () => {
  it("shows each tab only the inputs its mode applies, without the mode or the model", () => {
    expect(namesOf(panelInputsOf(audio, "speech"))).toEqual(["script"])
    expect(namesOf(panelInputsOf(audio, "voice-clone"))).toEqual([
      "script",
      "recording",
    ])
    expect(namesOf(panelInputsOf(audio, "voice-change"))).toEqual([
      "recording",
    ])
    expect(namesOf(panelInputsOf(audio, "music"))).toEqual(["description"])
  })

  it("sends only the inputs of the tab, and asks for no input another tab needs", () => {
    const values = {
      ...defaultsOf(audio),
      inputs: { mode: "music", description: "a slow piano", script: "hello" },
    }
    const body = bodyOf(bodyAppFor(audio, "music"), values)
    expect(body.inputs).not.toHaveProperty("script")
    expect(body.inputs).toHaveProperty("description", "a slow piano")
    expect(
      problemsOf(formAppFor(audio, "music"), values).map((one) => one.name)
    ).toEqual([])
  })

  it("names the recording of the tabs that take one", () => {
    expect(recordingOf(audio, "voice-clone")).toBe("recording")
    expect(recordingOf(audio, "voice-change")).toBe("recording")
    expect(recordingOf(audio, "speech")).toBeNull()
  })

  it("holds the clone's recording to 6 to 30 seconds, and a voice change to none", () => {
    expect(recordingLengthProblem("voice-clone", "recording", 4.04)).toEqual({
      name: "recording",
      key: "field.asset.tooShort",
      values: { seconds: 4, min: 6 },
    })
    expect(
      recordingLengthProblem("voice-clone", "recording", 31)?.key
    ).toBe("field.asset.tooLong")
    expect(recordingLengthProblem("voice-clone", "recording", 12)).toBeNull()
    expect(recordingLengthProblem("voice-change", "recording", 5)).toBeNull()
  })
})
