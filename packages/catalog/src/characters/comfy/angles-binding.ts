import type { EngineBinding } from "@rosesfield/contract"
import {
  type AngleSet,
  angleSets,
  type Distance,
  setPoses,
  viewsPerSet,
} from "#angles/angle-views"
import {
  loraDistanceWords,
  loraHeightWords,
  loraSideWords,
} from "#angles/comfy/angle-words"
import { anglesWorkflows } from "#angles/comfy/angles-workflows"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"
import { WorkflowInvalidError } from "#workflow-invalid.error"

type Pose = (typeof setPoses)[AngleSet][number]

const viewDistance: Distance = "medium"

function perSet(wordOf: (set: AngleSet) => string): Record<string, string> {
  return Object.fromEntries(angleSets.map((set) => [set, wordOf(set)]))
}

function poseOf(set: AngleSet, index: number): Pose {
  const pose = setPoses[set][index]
  if (pose === undefined) {
    throw new WorkflowInvalidError({
      folder: anglesWorkflows.set,
      reason: `the set ${set} has no view ${index + 1}`,
    })
  }
  return pose
}

function viewBindings(index: number): WorkflowValueBinding[] {
  const view = index + 1
  return [
    {
      from: "input",
      name: "angleSet",
      map: perSet((set) => loraSideWords[poseOf(set, index).side]),
      to: `side${view}`,
    },
    {
      from: "input",
      name: "angleSet",
      map: perSet((set) => loraHeightWords[poseOf(set, index).height]),
      to: `height${view}`,
    },
    {
      from: "input",
      name: "angleSet",
      map: perSet(() => loraDistanceWords[viewDistance]),
      to: `distance${view}`,
    },
    { from: "seed", to: `seed${view}` },
  ]
}

export function anglesSetBinding(): EngineBinding {
  return workflowBinding({
    workflow: anglesWorkflows.set,
    bindings: [
      { from: "input", name: "character", index: 0, to: "image" },
      ...Array.from({ length: viewsPerSet }, (_, index) =>
        viewBindings(index)
      ).flat(),
    ],
  })
}
