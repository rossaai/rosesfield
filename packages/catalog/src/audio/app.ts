import {
  type AudioMode,
  audioModes,
  chatterboxModel,
  modeGraphs,
  musicModel,
  soundModel,
  voiceChangeModel,
} from "#audio/audio-models"
import { audioEngine, audioEngineOf } from "#audio/comfy/audio-engine"
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

type InputEntry = AppInput["inputs"][number]

type Condition = { input: string; is?: readonly string[]; state?: string }

function holdsFor(when: readonly Condition[], mode: AudioMode): boolean {
  return when.every(
    (condition) =>
      condition.input !== "mode" ||
      condition.is === undefined ||
      condition.is.includes(mode)
  )
}

function narrowed<T extends readonly Condition[]>(when: T, mode: AudioMode): T {
  return when.map((condition) =>
    condition.input === "mode" && condition.is !== undefined
      ? { ...condition, is: [mode] }
      : condition
  ) as unknown as T
}

function forMode(input: InputEntry, mode: AudioMode): InputEntry | null {
  if ("when" in input && input.when !== undefined) {
    if (!holdsFor(input.when, mode)) {
      return null
    }
  }
  const one = { ...input } as InputEntry & {
    when?: readonly Condition[]
    bounds?: readonly { when: readonly Condition[] }[]
  }
  if (one.when !== undefined) {
    one.when = narrowed(one.when, mode)
  }
  if (one.bounds !== undefined) {
    one.bounds = one.bounds
      .filter((bound) => holdsFor(bound.when, mode))
      .map((bound) => ({ ...bound, when: narrowed(bound.when, mode) }))
  }
  if (
    one.type === "choice" &&
    one.bounds !== undefined &&
    one.bounds.length > 0
  ) {
    const allowed = new Set(
      one.bounds.flatMap((bound) =>
        "values" in bound && Array.isArray(bound.values) ? bound.values : []
      )
    )
    const options = one.options.filter((option) => allowed.has(option.value))
    if (options.length > 0) {
      const { bounds: _bounds, ...rest } = one
      return { ...rest, options, default: options[0]?.value ?? one.default }
    }
  }
  if (one.type === "choice" && one.name === "mode") {
    return {
      ...one,
      options: one.options.filter((option) => option.value === mode),
      default: mode,
    }
  }
  return one
}

export function audioAppOf(mode: AudioMode, id: string): AppInput {
  return defineApp({
    ...app,
    id,
    nameKey: `audio.mode.${mode}`,
    engine: audioEngineOf(mode),
    inputs: app.inputs.flatMap((input) => {
      const one = forMode(input, mode)
      return one === null ? [] : [one]
    }),
  })
}
