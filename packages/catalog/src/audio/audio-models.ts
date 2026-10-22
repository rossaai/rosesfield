import type { ModelTask } from "#comfy/model-tasks"

export const audioModes = [
  "speech",
  "clone",
  "change",
  "music",
  "sound",
] as const

export type AudioMode = (typeof audioModes)[number]

export const chatterboxModel = "chatterbox"

export const voiceChangeModel = "chatterbox-vc"

export const musicModel = "minimax-music-3"

export const soundModel = "stable-audio-3-medium"

export const speechHostedModel = "byteplus/seed-audio-1.0"

export const soundHostedModel = "elevenlabs/eleven_sfx_v2"

export const audioTasks: readonly string[] = ["speech", "sound"]

export const modeGraphs: Readonly<Record<AudioMode, string>> = {
  speech: chatterboxModel,
  clone: chatterboxModel,
  change: voiceChangeModel,
  music: musicModel,
  sound: soundModel,
}

export const graphTasks: Readonly<Record<string, ModelTask>> = {
  [chatterboxModel]: "speech",
  [voiceChangeModel]: "voice-change",
  [musicModel]: "music",
  [soundModel]: "sound",
}
