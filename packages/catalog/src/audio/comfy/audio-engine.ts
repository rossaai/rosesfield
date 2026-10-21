import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding, taskBinding } from "@rosesfield/generation/bindings"
import {
  audioTasks,
  chatterboxModel,
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

export const audioEngine: EngineBinding = taskBinding({
  tasks: audioTasks,
  input: "model",
  default: chatterboxModel,
  fallback: selectBinding({
    input: "model",
    options: {
      [chatterboxModel]: voiceBinding,
      [voiceChangeModel]: voiceChangeBinding,
      [musicModel]: musicBinding,
      [soundModel]: soundBinding,
    },
  }),
})
