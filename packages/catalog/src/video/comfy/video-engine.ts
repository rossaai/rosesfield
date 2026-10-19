import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { cameraSentences, funCameraPoses } from "#video/camera-moves"
import {
  framesFor,
  sizesFor,
  type VideoModel,
  type VideoResolution,
  videoAspects,
  videoLengths,
} from "#video/comfy/video-sizes"
import { videoWorkflows, withoutSound } from "#video/comfy/video-workflows"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

type Sound = "on" | "off"
type Side = "width" | "height"
type ValueMap = Record<string, string | number>

export const cameraWordsSeparator = "\n"

const outputsPerJob = "one"

const sides: readonly Side[] = ["width", "height"]

function lengthMap(model: VideoModel): ValueMap {
  return Object.fromEntries(
    videoLengths.map((seconds) => [String(seconds), framesFor(model, seconds)])
  )
}

function sizeMap(
  model: VideoModel,
  resolution: VideoResolution,
  side: Side,
  divisor: number
): ValueMap {
  const sizes = sizesFor(model, resolution)
  if (sizes === null) {
    return {}
  }
  return Object.fromEntries(
    videoAspects.map((aspect) => [aspect, sizes[aspect][side] / divisor])
  )
}

function sentenceMap(): ValueMap {
  const words: ValueMap = { auto: "" }
  for (const [move, sentence] of Object.entries(cameraSentences)) {
    words[move] = `${cameraWordsSeparator}${sentence}`
  }
  return words
}

function sizeBindings(
  model: VideoModel,
  resolution: VideoResolution,
  divisor = 1
): WorkflowValueBinding[] {
  return sides.map((side) => ({
    from: "aspectRatio",
    map: sizeMap(model, resolution, side, divisor),
    to: side,
  }))
}

function lengthBinding(to: string, model: VideoModel): WorkflowValueBinding {
  return { from: "input", name: "length", map: lengthMap(model), to }
}

const promptWithMove: readonly WorkflowValueBinding[] = [
  { from: "input", name: "prompt", to: "prompt" },
  {
    from: "input",
    name: "cameraMove",
    map: sentenceMap(),
    to: "cameraMove",
  },
]

const startFrame: WorkflowValueBinding = {
  from: "input",
  name: "startFrame",
  index: 0,
  to: "startFrame",
}

function ltxWorkflow(
  workflow: string,
  resolution: VideoResolution,
  sound: Sound,
  extra: WorkflowValueBinding[]
): EngineBinding {
  const bindings: WorkflowValueBinding[] = [
    ...promptWithMove,
    ...sizeBindings("ltx-2-5", resolution, 2),
    lengthBinding("frames", "ltx-2-5"),
    lengthBinding("audioFrames", "ltx-2-5"),
    { from: "seed", to: "seed" },
    ...extra,
  ]
  return sound === "on"
    ? workflowBinding({ workflow, bindings, outputsPerJob })
    : workflowBinding({
        workflow,
        bindings,
        outputsPerJob,
        patch: (graph) => withoutSound(graph, "370"),
      })
}

export function ltxTextBinding(
  resolution: VideoResolution,
  sound: Sound
): EngineBinding {
  return ltxWorkflow(videoWorkflows["ltx-2-5-text"], resolution, sound, [])
}

export function ltxStartFrameBinding(
  resolution: VideoResolution,
  sound: Sound
): EngineBinding {
  return ltxWorkflow(videoWorkflows["ltx-2-5-start-frame"], resolution, sound, [
    startFrame,
  ])
}

export function wanTextBinding(): EngineBinding {
  return workflowBinding({
    workflow: videoWorkflows["wan-2-2-text"],
    bindings: [
      ...promptWithMove,
      ...sizeBindings("wan-2-2", "480p"),
      lengthBinding("frames", "wan-2-2"),
      { from: "seed", to: "seed" },
    ],
    outputsPerJob,
  })
}

export function wanStartFrameBinding(): EngineBinding {
  return workflowBinding({
    workflow: videoWorkflows["wan-2-2-start-frame"],
    bindings: [
      { from: "input", name: "prompt", to: "prompt" },
      startFrame,
      ...sizeBindings("wan-2-2", "480p"),
      lengthBinding("frames", "wan-2-2"),
      { from: "seed", to: "seed" },
    ],
    outputsPerJob,
  })
}

export function wanCameraBinding(): EngineBinding {
  return workflowBinding({
    workflow: videoWorkflows["wan-2-2-camera"],
    bindings: [
      { from: "input", name: "prompt", to: "prompt" },
      startFrame,
      {
        from: "input",
        name: "cameraMove",
        map: { ...funCameraPoses },
        to: "cameraPose",
      },
      ...sizeBindings("wan-2-2", "480p"),
      lengthBinding("frames", "wan-2-2"),
      { from: "seed", to: "seed" },
    ],
    outputsPerJob,
  })
}

export function wanClipBinding(): EngineBinding {
  return workflowBinding({
    workflow: videoWorkflows["wan-2-2-clip"],
    bindings: [
      { from: "input", name: "prompt", to: "prompt" },
      { from: "input", name: "clip", index: 0, to: "clip" },
      ...sizeBindings("wan-2-2", "480p"),
      lengthBinding("frames", "wan-2-2"),
      { from: "seed", to: "seed" },
    ],
    outputsPerJob,
  })
}

function bySound(options: Record<string, EngineBinding>): EngineBinding {
  return selectBinding({ input: "sound", options })
}

function byResolution(
  bind: (resolution: VideoResolution, sound: Sound) => EngineBinding
): EngineBinding {
  return selectBinding({
    input: "resolution",
    options: {
      "480p": bySound({ on: bind("480p", "on"), off: bind("480p", "off") }),
      "720p": bySound({ on: bind("720p", "on"), off: bind("720p", "off") }),
    },
  })
}

function byFilled(
  input: string,
  filled: EngineBinding,
  empty: EngineBinding
): EngineBinding {
  return selectBinding({ input, by: "filled", options: { filled, empty } })
}

const ltx = byFilled(
  "startFrame",
  byResolution(ltxStartFrameBinding),
  byResolution(ltxTextBinding)
)

const camera = wanCameraBinding()

const wanFromStartFrame = selectBinding({
  input: "cameraMove",
  options: {
    auto: wanStartFrameBinding(),
    ...Object.fromEntries(
      Object.keys(funCameraPoses).map((move) => [move, camera])
    ),
  },
})

const wan = byFilled(
  "clip",
  wanClipBinding(),
  byFilled("startFrame", wanFromStartFrame, wanTextBinding())
)

export const videoEngine: EngineBinding = selectBinding({
  input: "model",
  options: { auto: ltx, "ltx-2-5": ltx, "wan-2-2": wan },
})
