import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import * as entry from "#lipsync/index"

type Manifest = { exports: Readonly<Record<string, string>> }

const manifest: Manifest = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8")
)

describe("the lip sync entry", () => {
  it("is a subpath of the catalog package that points at the lip sync index", () => {
    expect(manifest.exports["./lipsync"]).toBe("./src/lipsync/index.ts")
  })

  it("gives the screen the mode defaults and the Text chain", () => {
    expect(Object.keys(entry).sort()).toEqual([
      "SpeechChain",
      "clipModel",
      "graphModel",
      "lipInputsOf",
      "lipsyncModes",
      "modeDefaults",
      "speakThenSync",
      "speechAppOf",
      "speechDefaultOf",
      "speechInputsOf",
      "speechModelInput",
      "speechPlanOf",
      "speechRunOf",
      "speechTask",
      "speechTextInput",
      "spokenInputs",
      "videoProblemsOf",
    ])
  })
})
