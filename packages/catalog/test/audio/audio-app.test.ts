import { startRunBodyFor } from "@rosesfield/contract"
import { hostedModelOf, resolveBinding } from "@rosesfield/generation"
import type { HostedModel } from "@rosesfield/generation/bindings"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import {
  type AudioMode,
  audioModes,
  modeDefaults,
  modeGraphs,
  musicModel,
  soundHostedModel,
  soundModel,
  speechHostedModel,
  voiceChangeModel,
} from "#audio/audio-models"
import { appTasksOf, defaultModelOf, modelsForApp } from "#comfy/list-models"
import { audioDefinition } from "./audio-definition"

type Inputs = Record<string, unknown>

const audio = audioDefinition()
const body = startRunBodyFor(audio)
const recordingId = assetIdFormat.parse("8a7b6c5d-4e3f-4a2b-9c1d-0e9f8a7b6c5d")
const script = "The shop opens at nine on weekdays."
const description = "a door creaks open"

function issuesOf(inputs: Inputs): string[] {
  const result = body.safeParse({ inputs, count: 1 })
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."))
}

function parsedInputs(inputs: Inputs): Inputs {
  return body.parse({ inputs, count: 1 }).inputs
}

function hosted(id: string, makes: string): HostedModel {
  const provider = id.split("/")[0] ?? ""
  return { id, provider, takes: ["text"], makes: [makes], form: null }
}

const validInputs: Readonly<Record<AudioMode, Inputs>> = {
  speech: { mode: "speech", script },
  clone: { mode: "clone", script, recording: [recordingId] },
  change: { mode: "change", source: [recordingId], target: [recordingId] },
  music: { mode: "music", description: "a slow piano song", length: 5 },
  sound: { mode: "sound", description, length: 5 },
}

describe("the audio app", () => {
  it("opens each tab on its graph when no model is sent", () => {
    for (const mode of audioModes) {
      expect(parsedInputs(validInputs[mode]).model).toBe(modeGraphs[mode])
      expect(modeDefaults[mode][0]).toBe(modeGraphs[mode])
    }
    expect(modeGraphs).toEqual({
      speech: "chatterbox",
      clone: "chatterbox",
      change: voiceChangeModel,
      music: musicModel,
      sound: soundModel,
    })
    expect(defaultModelOf(audio)).toBe("chatterbox")
  })

  it("refuses a graph that belongs to another tab", () => {
    const musicOnChatterbox = { ...validInputs.music, model: "chatterbox" }
    const speechOnSound = { ...validInputs.speech, model: soundModel }
    const soundOnSound = { ...validInputs.sound, model: soundModel }
    expect(issuesOf(musicOnChatterbox)).toEqual(["inputs.model"])
    expect(issuesOf(speechOnSound)).toEqual(["inputs.model"])
    expect(issuesOf(soundOnSound)).toEqual([])
  })

  it("asks each tab for its own inputs", () => {
    expect(issuesOf({ mode: "speech" })).toEqual(["inputs.script"])
    expect(issuesOf({ mode: "clone", script })).toEqual(["inputs.recording"])
    const sourceOnly = { mode: "change", source: [recordingId] }
    expect(issuesOf(sourceOnly)).toEqual(["inputs.target"])
    expect(issuesOf({ mode: "music" })).toEqual(["inputs.description"])
    expect(issuesOf({ mode: "sound" })).toEqual(["inputs.description"])
    for (const mode of audioModes) {
      expect(issuesOf(validInputs[mode])).toEqual([])
    }
  })

  it("refuses the inputs of the other tabs", () => {
    const speechWithRecording = {
      ...validInputs.speech,
      recording: [recordingId],
    }
    const soundWithScript = { ...validInputs.sound, script }
    const soundWithLyrics = { ...validInputs.sound, lyrics: "la la" }
    expect(issuesOf(speechWithRecording)).toEqual(["inputs.recording"])
    expect(issuesOf(soundWithScript)).toEqual(["inputs.script"])
    expect(issuesOf(soundWithLyrics)).toEqual(["inputs.lyrics"])
  })

  it("holds music to 5 to 240 seconds and sound effects to 1 to 60", () => {
    const length = (mode: AudioMode, seconds: number): Inputs => ({
      ...validInputs[mode],
      length: seconds,
    })
    expect(issuesOf(length("music", 4))).toEqual(["inputs.length"])
    expect(issuesOf(length("music", 240))).toEqual([])
    expect(issuesOf(length("sound", 1))).toEqual([])
    expect(issuesOf(length("sound", 61))).toEqual(["inputs.length"])
    expect(parsedInputs({ mode: "sound", description }).length).toBe(10)
  })

  it("runs Seed Audio 1.0 and ElevenLabs SFX v2 on the Router", () => {
    for (const model of [speechHostedModel, soundHostedModel]) {
      const binding = resolveBinding(audio.engine, { model })
      expect(hostedModelOf(binding)).toBe(model)
    }
    expect(appTasksOf(audio)).toEqual(["speech", "sound"])
  })

  it("lists its four graphs, then the Router's speech and sound models", () => {
    const models = modelsForApp(audio, [
      hosted(speechHostedModel, "audio"),
      hosted(soundHostedModel, "audio"),
      hosted("maker/picture", "image"),
    ])
    expect(models.map((model) => [model.id, model.kind])).toEqual([
      ["chatterbox", "graph"],
      [voiceChangeModel, "graph"],
      [musicModel, "graph"],
      [soundModel, "graph"],
      [speechHostedModel, "hosted"],
      [soundHostedModel, "hosted"],
    ])
    const music = models.find((model) => model.id === musicModel)
    expect(music?.nameKey).toBe("audio.model.minimaxMusic3")
  })
})
