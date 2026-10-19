import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import {
  type AngleSet,
  angleSets,
  type Height,
  type Side,
  setPoses,
  viewsPerSet,
} from "#angles/angle-views"
import {
  loraDistanceWords,
  loraHeightWords,
  loraSideWords,
} from "#angles/comfy/angle-words"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

export const anglesWorkflows = {
  single: "angles-qwen-image-edit-2511",
  set: "angles-set-qwen-image-edit-2511",
} as const

const sourceBinding: WorkflowValueBinding = {
  from: "input",
  name: "image",
  index: 0,
  to: "image",
}

function setMap(
  index: number,
  wordOf: (pose: { side: Side; height: Height }) => string
): Record<string, string> {
  return Object.fromEntries(
    angleSets.map((set: AngleSet) => {
      const pose = setPoses[set][index]
      if (pose === undefined) {
        throw new Error(`The set ${set} has no view ${index}`)
      }
      return [set, wordOf(pose)]
    })
  )
}

function setBindings(): WorkflowValueBinding[] {
  return Array.from({ length: viewsPerSet }, (_, index) => {
    const view = index + 1
    const branchBindings: WorkflowValueBinding[] = [
      {
        from: "input",
        name: "angleSet",
        map: setMap(index, (pose) => loraSideWords[pose.side]),
        to: `side${view}`,
      },
      {
        from: "input",
        name: "angleSet",
        map: setMap(index, (pose) => loraHeightWords[pose.height]),
        to: `height${view}`,
      },
      {
        from: "input",
        name: "distance",
        map: { ...loraDistanceWords },
        to: `distance${view}`,
      },
      { from: "seed", to: `seed${view}` },
    ]
    return branchBindings
  }).flat()
}

const singleBindings: readonly WorkflowValueBinding[] = [
  { from: "input", name: "side", map: { ...loraSideWords }, to: "side" },
  { from: "input", name: "height", map: { ...loraHeightWords }, to: "height" },
  {
    from: "input",
    name: "distance",
    map: { ...loraDistanceWords },
    to: "distance",
  },
  { from: "seed", to: "seed" },
]

export const anglesBinding: EngineBinding = selectBinding({
  input: "mode",
  options: {
    set: workflowBinding({
      workflow: anglesWorkflows.set,
      bindings: [sourceBinding, ...setBindings()],
    }),
    single: workflowBinding({
      workflow: anglesWorkflows.single,
      bindings: [sourceBinding, ...singleBindings],
    }),
  },
})
