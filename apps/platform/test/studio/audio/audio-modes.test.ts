import { describe, expect, it } from "vitest"
import { bodyOf, defaultsOf, problemsOf } from "@/screens/app/app-form"
import { trayInputsOf } from "@/screens/app/inputs-panel"
import { type AppSetting, appSettingsPlan } from "@/screens/app/settings-plan"
import {
  bodyAppFor,
  formAppFor,
  recordingLengthProblem,
  recordingOf,
} from "@/studio/audio/audio-modes"
import { modeInput } from "@/studio/audio/audio-tabs"
import { audioListing } from "./audio-app"

const audio = audioListing()

function namesOf(inputs: readonly { name: string }[]): string[] {
  return inputs.map((input) => input.name)
}

function inputsOf(tab: string): string[] {
  return namesOf(trayInputsOf(bodyAppFor(audio, tab)))
}

function settingsOf(tab: string): string[] {
  const plan = appSettingsPlan(bodyAppFor(audio, tab), [modeInput])
  return plan.main.map((setting: AppSetting) =>
    setting.kind === "input" ? setting.input.name : setting.kind
  )
}

describe("the inputs of each Audio tab", () => {
  it("shows each tab only the inputs its mode applies, and its length among the settings below the model", () => {
    expect(inputsOf("speech")).toEqual(["script"])
    expect(inputsOf("clone")).toEqual(["recording", "script"])
    expect(inputsOf("change")).toEqual(["source", "target"])
    expect(inputsOf("music")).toEqual(["description"])
    expect(settingsOf("music")).toEqual(["length", "count"])
    expect(settingsOf("speech")).not.toContain(modeInput)
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

  it("gives each tab the lengths and the graph its mode allows", () => {
    const lengthIn = (tab: string) =>
      formAppFor(audio, tab).inputs.find((input) => input.name === "length")
    expect(lengthIn("sound")).toMatchObject({ min: 1, max: 60, default: 10 })
    expect(lengthIn("music")).toMatchObject({ min: 5, max: 240 })
    const model = bodyAppFor(audio, "change").inputs.find(
      (input) => input.name === "model"
    )
    expect(model).toMatchObject({
      default: "chatterbox-vc",
      options: [{ value: "chatterbox-vc" }],
    })
  })

  it("names the recording of the tabs that take one", () => {
    expect(recordingOf(audio, "clone")).toBe("recording")
    expect(recordingOf(audio, "change")).toBe("source")
    expect(recordingOf(audio, "speech")).toBeNull()
  })

  it("holds the clone's recording to 6 to 30 seconds, and a voice change to none", () => {
    expect(recordingLengthProblem("clone", "recording", 4.04)).toEqual({
      name: "recording",
      key: "field.asset.tooShort",
      values: { seconds: 4, min: 6 },
    })
    expect(recordingLengthProblem("clone", "recording", 31)?.key).toBe(
      "field.asset.tooLong"
    )
    expect(recordingLengthProblem("clone", "recording", 12)).toBeNull()
    expect(recordingLengthProblem("change", "recording", 5)).toBeNull()
  })
})
