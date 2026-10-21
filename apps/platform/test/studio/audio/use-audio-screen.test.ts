import { describe, expect, it } from "vitest"
import { defaultsOf } from "@/screens/app/app-form"
import { promptNameOf, tabOfRun } from "@/studio/audio/use-audio-screen"
import { audioListing, modelOf } from "./audio-app"

const audio = audioListing()

const effects = modelOf("elevenlabs/eleven_sfx_v2", "hosted", "sound", [
  {
    kind: "prompt",
    name: "text",
    path: "text",
    required: true,
    maxLength: 400,
    default: null,
  },
])

function valuesWith(inputs: Record<string, string>) {
  return { ...defaultsOf(audio), inputs }
}

describe("the Audio screen's state", () => {
  it("opens a recreated run on the tab of its mode", () => {
    expect(tabOfRun(audio, valuesWith({ mode: "music" }), [])).toBe("music")
  })

  it("opens a recreated hosted run, which sends no mode, on its model's task", () => {
    expect(
      tabOfRun(audio, valuesWith({ model: effects.id }), [effects])
    ).toBe("sound")
    expect(tabOfRun(audio, valuesWith({ model: "gone/model" }), [])).toBe(
      null
    )
  })

  it("carries the script into the prompt of the model a person picks", () => {
    expect(promptNameOf(effects, audio)).toBe("text")
    expect(promptNameOf(null, audio)).toBe("script")
  })
})
