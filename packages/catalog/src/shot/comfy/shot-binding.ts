import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { AppDefinitionInvalidError } from "#app-definition-invalid.error"
import { cameraMovements } from "#shot/shot-models"
import {
  autoValue,
  closingPhrase,
  phraseOf,
  type ShotList,
  shotLists,
} from "#shot/shot-words"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"
import { apiGraph } from "#workflow-entry.contract"

type Workflow = Record<string, { inputs: Record<string, unknown> }>

export const shotWorkflows = {
  "ltx-2-5": "shot-ltx-2-5",
  "wan-2-2-fun-camera": "shot-wan-2-2-fun-camera",
} as const

type FrameSize = { width: number; height: number }

export const ltxSizeStep = 64

export const ltxSizes: Readonly<
  Record<string, Readonly<Record<string, FrameSize>>>
> = {
  "480p": {
    "1:1": { width: 640, height: 640 },
    "4:3": { width: 768, height: 576 },
    "3:4": { width: 576, height: 768 },
    "16:9": { width: 896, height: 512 },
    "9:16": { width: 512, height: 896 },
  },
  "720p": {
    "1:1": { width: 960, height: 960 },
    "4:3": { width: 1088, height: 832 },
    "3:4": { width: 832, height: 1088 },
    "16:9": { width: 1280, height: 704 },
    "9:16": { width: 704, height: 1280 },
  },
  "1080p": {
    "1:1": { width: 1472, height: 1472 },
    "4:3": { width: 1728, height: 1280 },
    "3:4": { width: 1280, height: 1728 },
    "16:9": { width: 1920, height: 1088 },
    "9:16": { width: 1088, height: 1920 },
  },
}

export const wanSizes: Readonly<Record<string, FrameSize>> = {
  "1:1": { width: 640, height: 640 },
  "4:3": { width: 736, height: 544 },
  "3:4": { width: 544, height: 736 },
  "16:9": { width: 832, height: 480 },
  "9:16": { width: 480, height: 832 },
}

export const wanCameraPoses: Readonly<
  Record<(typeof cameraMovements)[number], string>
> = {
  static: "Static",
  "push-in": "Zoom In",
  "pull-out": "Zoom Out",
  "track-left": "Pan Left",
  "track-right": "Pan Right",
  "crane-up": "Pan Up",
  "crane-down": "Pan Down",
}

const ltxPhrases: readonly ShotList[] = [
  "movement",
  "camera",
  "lens",
  "focus",
  "light",
  "color",
  "mood",
]

const wanPhrases: readonly ShotList[] = [
  "camera",
  "lens",
  "focus",
  "light",
  "color",
  "mood",
]

function phraseMap(list: ShotList): Record<string, string> {
  const values = [autoValue, ...shotLists[list]]
  return Object.fromEntries(
    values.map((value) => [value, phraseOf(list, value)])
  )
}

function phraseBindings(lists: readonly ShotList[]): WorkflowValueBinding[] {
  return lists.map((list) => ({
    from: "input",
    name: list,
    map: phraseMap(list),
    to: list,
  }))
}

function mapOf<Value>(
  table: Readonly<Record<string, Value>>,
  pick: (value: Value) => string | number
): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(table).map(([key, value]) => [key, pick(value)])
  )
}

function nodeOf(
  workflow: Workflow,
  id: string
): { inputs: Record<string, unknown> } {
  const node = workflow[id]
  if (node === undefined) {
    throw new AppDefinitionInvalidError({
      folder: "shot",
      reason: `its workflow has no node ${id}`,
    })
  }
  return node
}

function ltxWorkflowWith(
  sound: "on" | "off",
  graph: Record<string, unknown>
): Workflow {
  const workflow: Workflow = apiGraph.parse(graph)
  nodeOf(workflow, "909").inputs.string_b = ` ${closingPhrase}`
  if (sound === "off") {
    delete nodeOf(workflow, "370").inputs.audio
  }
  return workflow
}

function sizeBindings(
  sizes: Readonly<Record<string, FrameSize>>
): WorkflowValueBinding[] {
  return [
    {
      from: "aspectRatio",
      map: mapOf(sizes, (size) => size.width),
      to: "width",
    },
    {
      from: "aspectRatio",
      map: mapOf(sizes, (size) => size.height),
      to: "height",
    },
  ]
}

function ltxBinding(
  sound: "on" | "off",
  sizes: Readonly<Record<string, FrameSize>>
): EngineBinding {
  return workflowBinding({
    workflow: shotWorkflows["ltx-2-5"],
    outputsPerJob: "one",
    patch: (graph) => ltxWorkflowWith(sound, graph),
    bindings: [
      { from: "input", name: "prompt", to: "prompt" },
      ...phraseBindings(ltxPhrases),
      { from: "input", name: "length", to: "seconds" },
      ...sizeBindings(sizes),
      { from: "seed", to: "seed" },
    ],
  })
}

function ltxResolutions(sound: "on" | "off"): EngineBinding {
  return selectBinding({
    input: "resolution",
    options: Object.fromEntries(
      Object.entries(ltxSizes).map(([resolution, sizes]) => [
        resolution,
        ltxBinding(sound, sizes),
      ])
    ),
  })
}

function wanWorkflowWith(
  camera: "on" | "off",
  graph: Record<string, unknown>
): Workflow {
  const workflow: Workflow = apiGraph.parse(graph)
  if (camera === "off") {
    delete nodeOf(workflow, "98").inputs.camera_conditions
  }
  return workflow
}

function wanBinding(camera: "on" | "off"): EngineBinding {
  const cameraBindings: WorkflowValueBinding[] =
    camera === "on"
      ? [
          {
            from: "input",
            name: "movement",
            map: { ...wanCameraPoses },
            to: "cameraPose",
          },
        ]
      : []
  return workflowBinding({
    workflow: shotWorkflows["wan-2-2-fun-camera"],
    outputsPerJob: "one",
    patch: (graph) => wanWorkflowWith(camera, graph),
    bindings: [
      { from: "input", name: "prompt", to: "prompt" },
      ...phraseBindings(wanPhrases),
      ...cameraBindings,
      { from: "input", name: "startFrame", index: 0, to: "startFrame" },
      ...sizeBindings(wanSizes),
      { from: "seed", to: "seed" },
    ],
  })
}

function wanMovements(): EngineBinding {
  const withCamera = wanBinding("on")
  return selectBinding({
    input: "movement",
    options: {
      [autoValue]: wanBinding("off"),
      ...Object.fromEntries(cameraMovements.map((move) => [move, withCamera])),
    },
  })
}

function byStartFrame(options: Record<string, EngineBinding>): EngineBinding {
  return selectBinding({ input: "startFrame", by: "filled", options })
}

export const shotBinding: EngineBinding = selectBinding({
  input: "model",
  options: {
    "ltx-2-5": byStartFrame({
      empty: selectBinding({
        input: "sound",
        options: { on: ltxResolutions("on"), off: ltxResolutions("off") },
      }),
    }),
    "wan-2-2-fun-camera": byStartFrame({
      filled: selectBinding({
        input: "resolution",
        options: { "480p": wanMovements() },
      }),
    }),
  },
})
