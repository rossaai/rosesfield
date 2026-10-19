import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

export const expandModes = ["format", "sides"] as const

export type ExpandMode = (typeof expandModes)[number]

export const expandFormats = ["1-1", "4-3", "3-4", "16-9", "9-16"] as const

export type ExpandFormat = (typeof expandFormats)[number]

export const expandSides = ["top", "right", "bottom", "left"] as const

export const canvasRatios = [
  "1:1",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
  "3:2",
  "2:3",
  "5:4",
  "4:5",
  "2:1",
  "1:2",
  "21:9",
  "9:21",
  "3:1",
  "1:3",
] as const

export const expandWorkflows: Readonly<Record<ExpandMode, string>> = {
  format: "expand-format-qwen-image",
  sides: "expand-sides-qwen-image",
}

export function ratioOfFormat(format: string): string {
  return format.replace("-", ":")
}

function formatPart(part: 0 | 1): Record<string, number> {
  return Object.fromEntries(
    expandFormats.map((format) => [format, Number(format.split("-")[part])])
  )
}

function modeBindings(mode: ExpandMode): WorkflowValueBinding[] {
  if (mode === "format") {
    return [
      { from: "input", name: "aspect", map: formatPart(0), to: "ratioWidth" },
      { from: "input", name: "aspect", map: formatPart(1), to: "ratioHeight" },
    ]
  }
  return expandSides.map((name) => ({ from: "input", name, to: name }))
}

function modeBinding(mode: ExpandMode): EngineBinding {
  return workflowBinding({
    workflow: expandWorkflows[mode],
    bindings: [
      { from: "input", name: "photo", index: 0, to: "photo" },
      { from: "input", name: "scene", to: "scene" },
      { from: "seed", to: "seed" },
      ...modeBindings(mode),
    ],
    outputsPerJob: "one",
  })
}

export const expandBinding: EngineBinding = selectBinding({
  input: "mode",
  options: { format: modeBinding("format"), sides: modeBinding("sides") },
})
