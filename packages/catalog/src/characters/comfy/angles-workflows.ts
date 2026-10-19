import type { EngineBinding } from "@rosesfield/contract"
import {
  type AngleSet,
  angleSets,
  angleSetViews,
  type View,
  viewsPerRun,
} from "#characters/angle-sets"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

const azimuth: Record<View, string> = {
  front: "front view",
  "front-right": "front-right quarter view",
  right: "right side view",
  "back-right": "back-right quarter view",
  back: "back view",
  "back-left": "back-left quarter view",
  left: "left side view",
  "front-left": "front-left quarter view",
  low: "front view",
  "eye-level": "front view",
  elevated: "front view",
  high: "front view",
}

const elevation: Record<View, string> = {
  front: "eye-level shot",
  "front-right": "eye-level shot",
  right: "eye-level shot",
  "back-right": "eye-level shot",
  back: "eye-level shot",
  "back-left": "eye-level shot",
  left: "eye-level shot",
  "front-left": "eye-level shot",
  low: "low-angle shot",
  "eye-level": "eye-level shot",
  elevated: "elevated shot",
  high: "high-angle shot",
}

const distance = "medium shot"

export function loraPromptOf(view: View): string {
  return `<sks> ${azimuth[view]} ${elevation[view]} ${distance}`
}

function promptMap(
  index: number,
  promptOf: (view: View) => string
): Record<string, string> {
  return Object.fromEntries(
    angleSets.map((set: AngleSet) => {
      const view = angleSetViews[set][index] ?? angleSetViews[set][0]
      return [set, promptOf(view)]
    })
  )
}

const branches = Array.from({ length: viewsPerRun }, (_, index) => index)

export const anglesWorkflow = "characters-angles-qwen-image-edit-2511"

const sourceBinding: WorkflowValueBinding = {
  from: "input",
  name: "character",
  index: 0,
  to: "character",
}

function qwenBranchBindings(index: number): WorkflowValueBinding[] {
  return [
    {
      from: "input",
      name: "angleSet",
      map: promptMap(index, loraPromptOf),
      to: `view${index + 1}`,
    },
    { from: "seed", to: `seed${index + 1}` },
  ]
}

export function qwenEdit2511Angles(): EngineBinding {
  return workflowBinding({
    workflow: anglesWorkflow,
    bindings: [sourceBinding, ...branches.flatMap(qwenBranchBindings)],
  })
}
