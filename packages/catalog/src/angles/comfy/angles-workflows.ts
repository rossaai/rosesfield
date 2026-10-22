import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import {
  type AngleSet,
  angleSets,
  type Distance,
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
import { WorkflowInvalidError } from "#workflow-invalid.error"

export const anglesWorkflows = {
  single: "angles-qwen-image-edit-2511",
  set: "angles-set-qwen-image-edit-2511",
} as const

export type AngleSetOptions = {
  source: string
  distance: Distance | "input"
}

type Pose = { side: Side; height: Height }

function sourceBinding(name: string): WorkflowValueBinding {
  return { from: "input", name, index: 0, to: "image" }
}

function setMap(
  index: number,
  wordOf: (pose: Pose) => string
): Record<string, string> {
  return Object.fromEntries(
    angleSets.map((set: AngleSet) => {
      const pose = setPoses[set][index]
      if (pose === undefined) {
        throw new WorkflowInvalidError({
          folder: anglesWorkflows.set,
          reason: `the set ${set} has no view ${index + 1}`,
        })
      }
      return [set, wordOf(pose)]
    })
  )
}

function distanceBinding(
  index: number,
  distance: AngleSetOptions["distance"]
): WorkflowValueBinding {
  const to = `distance${index + 1}`
  return distance === "input"
    ? { from: "input", name: "distance", map: { ...loraDistanceWords }, to }
    : {
        from: "input",
        name: "angleSet",
        map: setMap(index, () => loraDistanceWords[distance]),
        to,
      }
}

function viewBindings(
  index: number,
  distance: AngleSetOptions["distance"]
): WorkflowValueBinding[] {
  const view = index + 1
  return [
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
    distanceBinding(index, distance),
    { from: "seed", to: `seed${view}` },
  ]
}

export function angleSetBinding(options: AngleSetOptions): EngineBinding {
  return workflowBinding({
    workflow: anglesWorkflows.set,
    bindings: [
      sourceBinding(options.source),
      ...Array.from({ length: viewsPerSet }, (_, index) =>
        viewBindings(index, options.distance)
      ).flat(),
    ],
  })
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
    set: angleSetBinding({ source: "image", distance: "input" }),
    single: workflowBinding({
      workflow: anglesWorkflows.single,
      bindings: [sourceBinding("image"), ...singleBindings],
    }),
  },
})
