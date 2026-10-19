import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

type Resolution = "480p" | "720p"
type Side = { width: number; height: number }

export const videoEditModes = [
  "extend",
  "reframe",
  "background",
  "frame-rate",
] as const

export const videoEditFormats = ["1-1", "4-3", "3-4", "16-9", "9-16"] as const

export const videoEditAspectRatios = ["16:9", "9:16", "1:1", "4:3", "3:4"]

export const reframeSizes: Readonly<
  Record<Resolution, Readonly<Record<(typeof videoEditFormats)[number], Side>>>
> = {
  "480p": {
    "1-1": { width: 480, height: 480 },
    "4-3": { width: 640, height: 480 },
    "3-4": { width: 480, height: 640 },
    "16-9": { width: 848, height: 480 },
    "9-16": { width: 480, height: 848 },
  },
  "720p": {
    "1-1": { width: 720, height: 720 },
    "4-3": { width: 960, height: 720 },
    "3-4": { width: 720, height: 960 },
    "16-9": { width: 1280, height: 720 },
    "9-16": { width: 720, height: 1280 },
  },
}

export const backgroundColors = {
  green: 0x00b140,
  white: 0xffffff,
  black: 0x000000,
} as const

const shortSides: Readonly<Record<Resolution, number>> = {
  "480p": 480,
  "720p": 720,
}

const addedFrames: Readonly<Record<string, number>> = {
  "1": 17,
  "2": 33,
  "3": 49,
  "4": 65,
}

export const videoEditWorkflows = {
  extend: "video-edit-extend-wan-2-2",
  reframe: "video-edit-reframe-wan-vace",
  background: "video-edit-background-birefnet",
  frameRate: "video-edit-frame-rate-film",
} as const

const sourceAndSound: readonly WorkflowValueBinding[] = [
  { from: "input", name: "source", index: 0, to: "source" },
  {
    from: "input",
    name: "keepSound",
    map: { on: true, off: false },
    to: "keepSound",
  },
]

function extendBinding(): EngineBinding {
  return workflowBinding({
    workflow: videoEditWorkflows.extend,
    bindings: [
      ...sourceAndSound,
      {
        from: "input",
        name: "resolution",
        map: { ...shortSides },
        to: "shorterSide",
      },
      {
        from: "input",
        name: "seconds",
        map: { ...addedFrames },
        to: "frames",
      },
      { from: "input", name: "next", to: "prompt" },
      { from: "seed", to: "seed" },
    ],
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

export const videoEditEngine: EngineBinding = selectBinding({
  input: "mode",
  options: {
    extend: extendBinding(),
    reframe: selectBinding({
      input: "resolution",
      options: {
        "480p": reframeBinding("480p"),
        "720p": reframeBinding("720p"),
      },
    }),
    background: backgroundBinding(),
    "frame-rate": frameRateBinding(),
  },
})
