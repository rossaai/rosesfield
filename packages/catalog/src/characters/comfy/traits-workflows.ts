import type { EngineBinding } from "@rosesfield/contract"
import { traitsPromptBindings } from "#characters/comfy/traits-prompt"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

export const traitsSizes: Record<string, { width: number; height: number }> = {
  "3:4": { width: 1056, height: 1408 },
  "1:1": { width: 1232, height: 1232 },
  "9:16": { width: 928, height: 1648 },
}

export const traitsWorkflows = {
  "flux-2-klein-4b": "characters-traits-flux-2-klein-4b",
  "z-image-turbo": "characters-traits-z-image-turbo",
  "qwen-image-2512": "characters-traits-qwen-image-2512",
} as const

function mapSizes(side: "width" | "height"): Record<string, number> {
  return Object.fromEntries(
    Object.entries(traitsSizes).map(([ratio, size]) => [ratio, size[side]])
  )
}

function sizeBindings(width: string, height: string): WorkflowValueBinding[] {
  return [
    { from: "aspectRatio", map: mapSizes("width"), to: width },
    { from: "aspectRatio", map: mapSizes("height"), to: height },
  ]
}

const shared: readonly WorkflowValueBinding[] = [
  ...sizeBindings("width", "height"),
  { from: "count", to: "count" },
  { from: "seed", to: "seed" },
]

function traitsBinding(
  workflow: string,
  extra: readonly WorkflowValueBinding[] = []
): EngineBinding {
  return workflowBinding({
    workflow,
    bindings: [...traitsPromptBindings(), ...shared, ...extra],
  })
}

export function klein4bTraits(): EngineBinding {
  return traitsBinding(
    traitsWorkflows["flux-2-klein-4b"],
    sizeBindings("schedulerWidth", "schedulerHeight")
  )
}

export function zImageTurboTraits(): EngineBinding {
  return traitsBinding(traitsWorkflows["z-image-turbo"])
}

export function qwenImage2512Traits(): EngineBinding {
  return traitsBinding(traitsWorkflows["qwen-image-2512"])
}
