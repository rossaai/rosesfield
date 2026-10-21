import type { EngineBinding } from "@rosesfield/contract"
import {
  type ComfyValueBinding,
  comfyWorkflow,
  selectBinding,
  taskBinding,
} from "@rosesfield/generation/bindings"
import { findWorkflow } from "#list-workflows"
import { ltxSizes, videoLengths } from "#video/comfy/video-sizes"
import {
  extendGraph,
  extendNodes,
  extendWorkflow,
  framesExpression,
  sideExpression,
} from "#video-edit/comfy/extend-graph"
import {
  backgroundModel,
  editModel,
  extendModel,
  frameRateModel,
  reframeModel,
  videoEditTasks,
} from "#video-edit/video-edit-models"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"
import { WorkflowInvalidError } from "#workflow-invalid.error"

type Resolution = "480p" | "720p"
type Side = { width: number; height: number }

export const videoEditFormats = ["1-1", "4-3", "3-4", "16-9", "9-16"] as const

export const videoEditAspectRatios = ["16:9", "9:16", "1:1", "4:3", "3:4"]

export const extendSeconds: readonly number[] = videoLengths

export const reframeSizes: Readonly<
  Record<Resolution, Readonly<Record<(typeof videoEditFormats)[number], Side>>>
> = {
  "480p": {
    "1-1": { width: 480, height: 480 },
    "4-3": { width: 640, height: 480 },
    "3-4": { width: 480, height: 640 },
    "16-9": { width: 864, height: 480 },
    "9-16": { width: 480, height: 864 },
  },
  "720p": {
    "1-1": { width: 704, height: 704 },
    "4-3": { width: 896, height: 672 },
    "3-4": { width: 672, height: 896 },
    "16-9": { width: 1248, height: 704 },
    "9-16": { width: 704, height: 1248 },
  },
}

export const backgroundColors = {
  green: 0x00b140,
  white: 0xffffff,
  black: 0x000000,
} as const

export const extendShorterSides: Readonly<Record<Resolution, number>> = {
  "480p": ltxSizes["480p"]["16:9"].height,
  "720p": ltxSizes["720p"]["16:9"].height,
}

export const videoEditWorkflows = {
  extend: extendWorkflow,
  reframe: "video-edit-reframe-ltx-2-3",
  background: "video-edit-background-birefnet",
  frameRate: "video-edit-frame-rate-film",
} as const

const keepSound = { on: true, off: false }

const sourceAndSound: readonly WorkflowValueBinding[] = [
  { from: "input", name: "source", index: 0, to: "source" },
  { from: "input", name: "keepSound", map: keepSound, to: "keepSound" },
]

function extendInputs(): ComfyValueBinding[] {
  const at = (node: string, input: string): ComfyValueBinding["path"] => [
    node,
    "inputs",
    input,
  ]
  const sides = (side: "a" | "b"): Record<string, string> =>
    Object.fromEntries(
      Object.entries(extendShorterSides).map(([resolution, short]) => [
        resolution,
        sideExpression(short, side),
      ])
    )
  const frames = Object.fromEntries(
    extendSeconds.map((seconds) => [
      String(seconds),
      framesExpression(seconds),
    ])
  )
  const n = extendNodes
  return [
    { from: "input", name: "source", index: 0, path: at(n.clip, "file") },
    {
      from: "input",
      name: "keepSound",
      map: keepSound,
      path: at(n.keepSound, "value"),
    },
    {
      from: "input",
      name: "seconds",
      map: frames,
      path: at(n.frames, "expression"),
    },
    {
      from: "input",
      name: "resolution",
      map: sides("a"),
      path: at(n.width, "expression"),
    },
    {
      from: "input",
      name: "resolution",
      map: sides("b"),
      path: at(n.height, "expression"),
    },
  ]
}

function extendBinding(): EngineBinding {
  const workflow = findWorkflow(extendWorkflow)
  if (workflow === null) {
    throw new WorkflowInvalidError({
      folder: extendWorkflow,
      reason: "no folder of workflows/ holds it",
    })
  }
  const entry = (name: string): ComfyValueBinding["path"] => {
    const target = workflow.inputs[name]
    if (target === undefined) {
      throw new WorkflowInvalidError({
        folder: extendWorkflow,
        reason: `its input map has no ${name}`,
      })
    }
    return [...target.path]
  }
  return comfyWorkflow({
    workflow: extendGraph(workflow.graph),
    bindings: [
      ...extendInputs(),
      { from: "input", name: "next", path: entry("prompt") },
      { from: "seed", path: entry("seed") },
    ],
    models: [...workflow.models],
    outputsPerJob: "all",
  })
}

function sideMap(
  resolution: Resolution,
  side: keyof Side
): Record<string, number> {
  return Object.fromEntries(
    videoEditFormats.map((format) => [
      format,
      reframeSizes[resolution][format][side],
    ])
  )
}

function reframeBinding(resolution: Resolution): EngineBinding {
  return workflowBinding({
    workflow: videoEditWorkflows.reframe,
    bindings: [
      ...sourceAndSound,
      {
        from: "input",
        name: "aspect",
        map: sideMap(resolution, "width"),
        to: "width",
      },
      {
        from: "input",
        name: "aspect",
        map: sideMap(resolution, "height"),
        to: "height",
      },
      { from: "input", name: "around", to: "prompt" },
      { from: "seed", to: "seed" },
    ],
  })
}

function backgroundBinding(): EngineBinding {
  return workflowBinding({
    workflow: videoEditWorkflows.background,
    bindings: [
      ...sourceAndSound,
      {
        from: "input",
        name: "color",
        map: { ...backgroundColors },
        to: "color",
      },
    ],
  })
}

function frameRateBinding(): EngineBinding {
  return workflowBinding({
    workflow: videoEditWorkflows.frameRate,
    bindings: [
      ...sourceAndSound,
      {
        from: "input",
        name: "factor",
        map: { "2x": 2, "4x": 4 },
        to: "multiplier",
      },
      {
        from: "input",
        name: "factor",
        map: { "2x": "a * 2", "4x": "a * 4" },
        to: "frameRateExpression",
      },
    ],
  })
}

export const videoEditGraphs: EngineBinding = selectBinding({
  input: "model",
  options: {
    [extendModel]: extendBinding(),
    [reframeModel]: selectBinding({
      input: "resolution",
      options: {
        "480p": reframeBinding("480p"),
        "720p": reframeBinding("720p"),
      },
    }),
    [backgroundModel]: backgroundBinding(),
    [frameRateModel]: frameRateBinding(),
  },
})

export const videoEditEngine: EngineBinding = taskBinding({
  tasks: videoEditTasks,
  input: "model",
  default: editModel,
  fallback: videoEditGraphs,
})
