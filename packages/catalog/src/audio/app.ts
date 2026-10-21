import {
  type AudioMode,
  audioModes,
  chatterboxModel,
  modeGraphs,
  musicModel,
  soundModel,
  voiceChangeModel,
} from "#audio/audio-models"
import { audioEngine } from "#audio/comfy/audio-engine"
import { voiceLanguageValues } from "#audio/comfy/chatterbox-binding"
import { type AppInput, defineApp } from "#define-app"

const runSeconds = 900

type ModeWhen = [{ input: "mode"; is: AudioMode[] }]

function inModes(...modes: AudioMode[]): ModeWhen {
  return [{ input: "mode", is: modes }]
}

const modelBounds = audioModes.map((mode) => ({
  when: inModes(mode),
  values: [modeGraphs[mode]],
}))

export const app: AppInput = defineApp({
  id: "audio",
  nameKey: "audio.name",
  category: "audio",
  inputs: [
    {
      type: "choice",
      name: "mode",
      scope: "app",
      labelKey: "audio.input.mode.label",
      options: audioModes.map((value) => ({
        value,
        labelKey: `audio.mode.${value}`,
      })),
      default: "speech",
    },
    {
      type: "choice",
      name: "model",
      labelKey: "audio.input.model.label",
      options: [
        { value: chatterboxModel, labelKey: "audio.model.chatterbox" },
        { value: voiceChangeModel, labelKey: "audio.model.chatterboxVc" },
        { value: musicModel, labelKey: "audio.model.minimaxMusic3" },
        { value: soundModel, labelKey: "audio.model.stableAudio3Medium" },
      ],
      default: chatterboxModel,
      bounds: modelBounds,
    },
    {
      type: "prompt",
      name: "script",
      labelKey: "audio.input.script.label",
      presence: "required",
      maxLength: 500,
      when: inModes("speech", "clone"),
    },
    {
      type: "choice",
      name: "language",
      labelKey: "audio.input.language.label",
      options: voiceLanguageValues.map((value) => ({
        value,
        labelKey: `audio.choice.language.${value}`,
      })),
      default: "en",
      when: inModes("speech", "clone"),
    },
    {
      type: "audio",
      name: "recording",
      labelKey: "audio.input.recording.label",
      presence: "required",
      max: 1,
      when: inModes("clone"),
    },
    {
      type: "number",
      name: "expression",
      labelKey: "audio.input.expression.label",
      min: 0,
      max: 2,
      step: 0.1,
      default: 0.5,
      when: inModes("speech", "clone"),
    },
    {
      type: "audio",
      name: "source",
      labelKey: "audio.input.source.label",
      presence: "required",
      max: 1,
      when: inModes("change"),
    },
    {
      type: "audio",
      name: "target",
      labelKey: "audio.input.target.label",
      presence: "required",
      max: 1,
      when: inModes("change"),
    },
    {
      type: "prompt",
      name: "description",
      labelKey: "audio.input.description.label",
      presence: "required",
      maxLength: 1000,
      when: inModes("music", "sound"),
    },
    {
      type: "prompt",
      name: "lyrics",
      labelKey: "audio.input.lyrics.label",
      presence: "optional",
      maxLength: 3000,
      when: inModes("music"),
    },
    {
      type: "number",
      name: "length",
      labelKey: "audio.input.length.label",
      min: 1,
      max: 240,
      step: 1,
      default: 10,
      bounds: [
        { when: inModes("music"), min: 5, max: 240 },
        { when: inModes("sound"), min: 1, max: 60 },
      ],
      when: inModes("music", "sound"),
    },
    { type: "seed", name: "seed", labelKey: "audio.input.seed.label" },
  ],
  output: { kind: "audio", count: { default: 1, max: 4 } },
  engine: audioEngine,
  limits: { timeoutSeconds: runSeconds, maxRetries: 0 },
})
