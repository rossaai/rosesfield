import { type AppInput, defineApp } from "#define-app"
import {
  voiceBinding,
  voiceLanguageValues,
  voiceModes,
} from "#audio/comfy/chatterbox-binding"

export const app: AppInput = defineApp({
  id: "voice",
  nameKey: "voice.name",
  category: "audio",
  inputs: [
    {
      type: "choice",
      name: "mode",
      labelKey: "voice.input.mode.label",
      options: voiceModes.map((value) => ({
        value,
        labelKey: `voice.choice.mode.${value}`,
      })),
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
      type: "choice",
      name: "language",
      labelKey: "voice.input.language.label",
      options: voiceLanguageValues.map((value) => ({
        value,
        labelKey: `voice.choice.language.${value}`,
      })),
      default: "en",
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
  engine: voiceBinding,
  limits: { timeoutSeconds: 300, maxRetries: 0 },
})
