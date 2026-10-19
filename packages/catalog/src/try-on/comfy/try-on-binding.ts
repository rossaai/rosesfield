import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { tryOnPrompts } from "#try-on/comfy/try-on-prompts"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

export const tryOnModels = [
  "qwen-image-edit-2511",
  "qwen-image-edit-2511-lightning",
  "flux2-klein-4b",
] as const

export type TryOnModel = (typeof tryOnModels)[number]

export const tryOnWorkflows: Readonly<Record<TryOnModel, string>> = {
  "qwen-image-edit-2511": "try-on-qwen-image-edit-2511",
  "qwen-image-edit-2511-lightning": "try-on-qwen-image-edit-2511-lightning",
  "flux2-klein-4b": "try-on-flux-2-klein-4b",
}

export const tryOnAspectRatios = [
  "1:2",
  "9:16",
  "3:5",
  "5:8",
  "2:3",
  "3:4",
  "4:5",
  "1:1",
  "5:4",
  "4:3",
  "3:2",
  "8:5",
  "5:3",
  "16:9",
  "2:1",
]

const bindings: readonly WorkflowValueBinding[] = [
  { from: "input", name: "person", index: 0, to: "person" },
  { from: "input", name: "clothes", index: 0, to: "clothes" },
  { from: "input", name: "part", map: tryOnPrompts, to: "prompt" },
  { from: "seed", to: "seed" },
]

export const tryOnEngine: EngineBinding = selectBinding({
  input: "model",
  options: Object.fromEntries(
    tryOnModels.map((model) => [
      model,
      workflowBinding({ workflow: tryOnWorkflows[model], bindings }),
    ])
  ),
})
