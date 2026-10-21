import {
  type AppDefinition,
  appDefinition,
  appId,
  assetId,
  type Run,
  type RunInputs,
  runId,
} from "@rosesfield/contract"
import { taskBinding } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import type { CatalogModel } from "#comfy/model-catalog.contract"
import {
  speechAppOf,
  speechDefaultOf,
  speechInputsOf,
  speechRunOf,
  speechTask,
  spokenInputs,
} from "#lipsync/lipsync-speech"

function appWithTasks(id: string, tasks: readonly string[]): AppDefinition {
  return appDefinition.parse({
    id,
    nameKey: "name",
    category: "audio",
    inputs: [
      {
        type: "choice",
        name: "model",
        labelKey: "inputs.model",
        options: [{ value: "speech-graph", labelKey: "model.speechGraph" }],
        default: "speech-graph",
      },
      {
        type: "prompt",
        name: "script",
        labelKey: "inputs.script",
        presence: "required",
        maxLength: 20,
      },
    ],
    output: { kind: "audio", count: { default: 1, max: 1 } },
    engine: taskBinding({
      tasks,
      input: "model",
      default: "speech-graph",
      fallback: { adapter: "demo", config: {} },
    }),
    limits: { timeoutSeconds: 60, maxRetries: 0 },
  })
}

const music = appWithTasks("music", ["music"])
const audio = appWithTasks("audio", ["music", speechTask])
const speechAudio = assetId.parse("1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d")
const yourAudio = assetId.parse("2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e")

function speechRun(status: Run["status"], outputs: readonly string[]): Run {
  return {
    id: runId.parse("3c4d5e6f-7a8b-4c9d-8e0f-2a3b4c5d6e7f"),
    appId: appId.parse("audio"),
    status,
    inputs: { model: "speech-graph", script: "Hello there" },
    count: 1,
    aspectRatio: null,
    seed: 7,
    outputs: outputs.map((output) => assetId.parse(output)),
    progress: null,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: { amount: 0.01, currency: "USD" },
    origin: "live",
    failure: null,
    createdAt: "2026-10-20T10:00:00.000Z",
    finishedAt: "2026-10-20T10:00:30.000Z",
  }
}

const lipsyncInputs: RunInputs = {
  mode: "photo",
  model: "ltx-2-3",
  audio: [yourAudio],
}

describe("the speech run that Text makes first", () => {
  it("asks the speech app for your line on the voice you picked", () => {
    expect(
      speechRunOf([music, audio], "  Hello there ", "hosted/voice")
    ).toEqual({
      appId: "audio",
      inputs: { model: "hosted/voice", script: "Hello there" },
    })
  })

  it("asks for your line on the speech default when you pick no voice", () => {
    expect(speechRunOf([music, audio], "Hello there", null)).toEqual({
      appId: "audio",
      inputs: { model: "speech-graph", script: "Hello there" },
    })
  })

  it("asks for no speech run with no line, a line past the app's length or no speech app", () => {
    expect(speechRunOf([music, audio], "   ", null)).toBeNull()
    expect(speechRunOf([music, audio], "a".repeat(21), null)).toBeNull()
    expect(speechRunOf([music], "Hello there", null)).toBeNull()
  })

  it("finds the app that holds the speech task and reads its default", () => {
    expect(speechAppOf([music, audio])?.id).toBe("audio")
    expect(speechDefaultOf([music, audio])).toBe("speech-graph")
  })

  it("finds no speech app and no default when no app holds the task", () => {
    expect(speechAppOf([music])).toBeNull()
    expect(speechDefaultOf([music])).toBeNull()
  })

  it("gives the lip sync run the audio the finished speech run made", () => {
    const inputs = spokenInputs(lipsyncInputs, speechRun("done", [speechAudio]))
    expect(inputs).toEqual({
      mode: "photo",
      model: "ltx-2-3",
      audio: [speechAudio],
    })
  })

  it("starts no lip sync run before the speech run is done or when it made nothing", () => {
    expect(
      spokenInputs(lipsyncInputs, speechRun("running", [speechAudio]))
    ).toBeNull()
    expect(
      spokenInputs(lipsyncInputs, speechRun("failed", [speechAudio]))
    ).toBeNull()
    expect(spokenInputs(lipsyncInputs, speechRun("done", []))).toBeNull()
  })
})

const hostedVoice: CatalogModel = {
  id: "byteplus/seed-audio-1.0",
  kind: "hosted",
  maker: "ByteDance",
  name: "Seed Audio 1.0",
  nameKey: null,
  task: speechTask,
  tags: [{ kind: "hosted" }],
  form: [
    {
      kind: "text",
      name: "text",
      path: "text",
      required: true,
      maxLength: 12,
      default: null,
    },
    {
      kind: "choice",
      name: "speaker",
      path: "speaker",
      required: true,
      options: ["warm", "bright"],
      default: "warm",
    },
    {
      kind: "number",
      name: "speed",
      path: "speed",
      required: false,
      min: 0.5,
      max: 2,
      integer: false,
      default: 1,
    },
  ],
}

describe("the inputs of the speech run for the voice you picked", () => {
  it("writes your line in the hosted voice's own text field, with the defaults its schema needs", () => {
    expect(
      speechInputsOf({
        app: audio,
        voice: hostedVoice,
        model: hostedVoice.id,
        text: " Hello there ",
      })
    ).toEqual({
      model: "byteplus/seed-audio-1.0",
      speaker: "warm",
      text: "Hello there",
    })
  })

  it("holds a line past the hosted voice's own length to that length", () => {
    expect(
      speechInputsOf({
        app: audio,
        voice: hostedVoice,
        model: hostedVoice.id,
        text: "a".repeat(13),
      })
    ).toBeNull()
  })

  it("writes your line in the app's own script input for a voice of the app's graph", () => {
    expect(
      speechInputsOf({
        app: audio,
        voice: null,
        model: "speech-graph",
        text: "Hello there",
      })
    ).toEqual({ model: "speech-graph", script: "Hello there" })
  })

  it("gives the audio the speech made to the input the lip sync model names", () => {
    expect(
      spokenInputs(
        { model: "kling/lip-sync" },
        speechRun("done", [speechAudio]),
        "voiceTrack"
      )
    ).toEqual({ model: "kling/lip-sync", voiceTrack: [speechAudio] })
  })
})
