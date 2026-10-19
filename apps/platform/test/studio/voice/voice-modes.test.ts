import {
  type AppListing,
  appDefinition,
  appListing,
  startRunBodyFor,
} from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { bodyOf, defaultsOf, problemsOf } from "@/screens/app/app-form"
import {
  bodyAppFor,
  formAppFor,
  modeOf,
  panelInputsOf,
  recordingLengthProblem,
  type VoiceMode,
} from "@/studio/voice/voice-modes"
import { app as voiceInput } from "../../../../../packages/catalog/src/voice/app"

function voiceListing(): AppListing {
  return appListing.parse({
    id: "voice",
    nameKey: "voice.name",
    category: "audio",
    inputs: [
      {
        type: "choice",
        name: "mode",
        labelKey: "voice.input.mode.label",
        options: [
          { value: "model", labelKey: "voice.choice.mode.model" },
          { value: "recording", labelKey: "voice.choice.mode.recording" },
        ],
        default: "model",
      },
      {
        type: "prompt",
        name: "script",
        labelKey: "voice.input.script.label",
        presence: "required",
        maxLength: 500,
      },
      {
        type: "audio",
        name: "recording",
        labelKey: "voice.input.recording.label",
        presence: "required",
        max: 1,
        when: [{ input: "mode", is: ["recording"] }],
      },
      {
        type: "number",
        name: "expression",
        labelKey: "voice.input.expression.label",
        min: 0,
        max: 2,
        step: 0.1,
        default: 0.5,
      },
      { type: "seed", name: "seed", labelKey: "voice.input.seed.label" },
    ],
    output: { kind: "audio", count: { default: 1, max: 4 } },
    limits: { timeoutSeconds: 300, maxRetries: 0 },
  })
}

const app = voiceListing()
const recordingId = "8a7b6c5d-4e3f-4a2b-9c1d-0e9f8a7b6c5d"

function valuesIn(mode: string, inputs: Record<string, string | string[]>) {
  const base = defaultsOf(app)
  return { ...base, inputs: { ...base.inputs, mode, ...inputs } }
}

function problemNames(mode: VoiceMode, values: ReturnType<typeof valuesIn>) {
  return problemsOf(formAppFor(app, mode), values).map(
    (problem) => problem.name
  )
}

describe("the voice modes", () => {
  it("asks for the recording only in Use a recording", () => {
    const values = valuesIn("recording", { script: "Hello there" })
    expect(problemNames("recording", values)).toEqual(["recording"])
    expect(problemNames("model", values)).toEqual([])
  })

  it("leaves a recording from Use a recording out of a run in the model's voice", () => {
    const values = valuesIn("model", {
      script: "Hello there",
      recording: [recordingId],
    })
    expect(bodyOf(bodyAppFor(app, modeOf(values)), values)).toEqual({
      inputs: { mode: "model", script: "Hello there", expression: 0.5 },
      count: 1,
    })
  })

  it("sends the recording in Use a recording", () => {
    const values = valuesIn("recording", {
      script: "Hello there",
      recording: [recordingId],
    })
    expect(bodyOf(bodyAppFor(app, modeOf(values)), values).inputs).toEqual({
      mode: "recording",
      script: "Hello there",
      recording: [recordingId],
      expression: 0.5,
    })
  })

  it("shows the mode first and leaves the seed to Advanced", () => {
    const names = (mode: VoiceMode) =>
      panelInputsOf(app, mode).map((input) => input.name)
    expect(names("model")).toEqual(["mode", "script", "expression"])
    expect(names("recording")).toEqual([
      "mode",
      "script",
      "recording",
      "expression",
    ])
  })

  it("reads an unknown mode as the model's voice", () => {
    expect(modeOf(valuesIn("sing", {}))).toBe("model")
  })
})

describe("the recording's length", () => {
  it("takes a recording of 6 to 30 seconds", () => {
    expect(recordingLengthProblem(6)).toBeNull()
    expect(recordingLengthProblem(12)).toBeNull()
    expect(recordingLengthProblem(30)).toBeNull()
  })

  it("refuses a recording under 6 seconds and names its length", () => {
    expect(recordingLengthProblem(5.94)).toEqual({
      name: "recording",
      key: "field.asset.tooShort",
      values: { seconds: 5.9, min: 6 },
    })
  })

  it("refuses a recording over 30 seconds and names its length", () => {
    expect(recordingLengthProblem(45)).toEqual({
      name: "recording",
      key: "field.asset.tooLong",
      values: { seconds: 45, max: 30 },
    })
    expect(recordingLengthProblem(30.2)?.key).toBe("field.asset.tooLong")
  })
})

describe("the voice screen against the catalog's Voice", () => {
  const definition = appDefinition.parse(voiceInput)
  const listing = appListing.parse(voiceInput)
  const contract = startRunBodyFor(definition)

  function screenOf(
    mode: VoiceMode,
    inputs: Record<string, string[] | string>
  ) {
    const base = defaultsOf(listing)
    const values = { ...base, inputs: { ...base.inputs, mode, ...inputs } }
    return {
      problems: problemsOf(formAppFor(listing, mode), values).map(
        (problem) => problem.name
      ),
      accepted: contract.safeParse(bodyOf(bodyAppFor(listing, mode), values))
        .success,
    }
  }

  it("sends a run the contract takes in each mode", () => {
    const script = "Hello there"
    expect(screenOf("model", { script, recording: [recordingId] })).toEqual({
      problems: [],
      accepted: true,
    })
    expect(screenOf("recording", { script, recording: [recordingId] })).toEqual(
      { problems: [], accepted: true }
    )
  })

  it("stops the run the contract refuses before it is sent", () => {
    expect(screenOf("recording", { script: "Hello there" })).toEqual({
      problems: ["recording"],
      accepted: false,
    })
    expect(screenOf("model", { script: "" })).toEqual({
      problems: ["script"],
      accepted: false,
    })
  })
})
