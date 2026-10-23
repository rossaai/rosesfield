import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding, taskBinding } from "@rosesfield/generation/bindings"
import {
  type AudioMode,
  audioTasks,
  chatterboxModel,
  graphTasks,
  modeGraphs,
  musicModel,
  soundModel,
  voiceChangeModel,
} from "#audio/audio-models"
import { voiceBinding } from "#audio/comfy/chatterbox-binding"
import { workflowBinding } from "#workflow-binding"

export const voiceChangeWorkflow = "audio-voice-change-chatterbox"

export const musicWorkflow = "audio-music-minimax-music-3"

export const soundWorkflow = "audio-sound-stable-audio-3"

export const voiceChangeBinding: EngineBinding = workflowBinding({
  workflow: voiceChangeWorkflow,
  bindings: [
    { from: "input", name: "source", index: 0, to: "source" },
    { from: "input", name: "target", index: 0, to: "target" },
    { from: "seed", to: "seed" },
  ],
  outputsPerJob: "one",
})

export const musicBinding: EngineBinding = workflowBinding({
  workflow: musicWorkflow,
  bindings: [
    { from: "input", name: "description", to: "description" },
    { from: "input", name: "lyrics", to: "lyrics" },
    { from: "input", name: "length", to: "length" },
    { from: "seed", to: "seed" },
    { from: "seed", to: "samplerSeed" },
  ],
  outputsPerJob: "one",
})

export const soundBinding: EngineBinding = workflowBinding({
  workflow: soundWorkflow,
  bindings: [
    { from: "input", name: "description", to: "description" },
    { from: "input", name: "length", to: "length" },
    { from: "seed", to: "seed" },
  ],
  outputsPerJob: "one",
})

const audioFallback: EngineBinding = selectBinding({
  input: "model",
  options: {
    [chatterboxModel]: voiceBinding,
    [voiceChangeModel]: voiceChangeBinding,
    [musicModel]: musicBinding,
    [soundModel]: soundBinding,
  },
})

export const audioEngine: EngineBinding = taskBinding({
  tasks: audioTasks,
  input: "model",
  default: chatterboxModel,
  graphTasks,
  fallback: audioFallback,
})

const modeTasks: Readonly<Record<AudioMode, readonly string[]>> = {
  speech: ["speech"],
  clone: [],
  change: [],
  music: [],
  sound: ["sound"],
}

export function audioEngineOf(mode: AudioMode): EngineBinding {
  return taskBinding({
    tasks: modeTasks[mode],
    input: "model",
    default: modeGraphs[mode],
    graphTasks,
    fallback: audioFallback,
  })
}
