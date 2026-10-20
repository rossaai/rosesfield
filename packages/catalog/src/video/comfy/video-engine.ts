import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import {
  cameraMoves,
  cameraWordsKeyOf,
  cameraWordsSeparator,
} from "#video/camera-moves"
import {
  type FrameSize,
  framesFor,
  ltxSizes,
  type VideoAspect,
  type VideoResolution,
  videoAspects,
  videoLengths,
} from "#video/comfy/video-sizes"
import {
  videoWorkflows,
  withoutLastFrame,
  withoutSound,
} from "#video/comfy/video-workflows"
import { videoCopy } from "#video/copy.en"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

type Sound = "on" | "off"
type Side = keyof FrameSize
type ValueMap = Record<string, string | number>

const outputsPerJob = "one"

const audioNode = "370"

const sides: readonly Side[] = ["width", "height"]

const firstPassDivisor = 2

function lengthMap(): ValueMap {
  return Object.fromEntries(
    videoLengths.map((seconds) => [String(seconds), framesFor(seconds)])
  )
}

function sizeMap(resolution: VideoResolution, side: Side): ValueMap {
  const sizes: Record<VideoAspect, FrameSize> = ltxSizes[resolution]
  return Object.fromEntries(
    videoAspects.map((aspect) => [
      aspect,
      sizes[aspect][side] / firstPassDivisor,
    ])
  )
}

export function cameraWordsOf(move: string): string {
  if (move === "auto") {
    return ""
  }
  const row = cameraMoves.find((one) => one.value === move)
  const words =
    row === undefined || row.value === "auto"
      ? undefined
      : videoCopy[cameraWordsKeyOf(row.value)]
  return words === undefined ? "" : words
}

function sentenceMap(): ValueMap {
  return Object.fromEntries(
    cameraMoves.map((move) => {
      const words = cameraWordsOf(move.value)
      return [move.value, words === "" ? "" : `${cameraWordsSeparator}${words}`]
    })
  )
}

function ltxBindings(resolution: VideoResolution): WorkflowValueBinding[] {
  return [
    { from: "input", name: "prompt", to: "prompt" },
    {
      from: "input",
      name: "cameraMove",
      map: sentenceMap(),
      to: "cameraMove",
    },
    ...sides.map(
      (side): WorkflowValueBinding => ({
        from: "aspectRatio",
        map: sizeMap(resolution, side),
        to: side,
      })
    ),
    { from: "input", name: "length", map: lengthMap(), to: "frames" },
    { from: "input", name: "length", map: lengthMap(), to: "audioFrames" },
    { from: "seed", to: "seed" },
  ]
}

const startFrame: WorkflowValueBinding = {
  from: "input",
  name: "startFrame",
  index: 0,
  to: "startFrame",
}

const lastFrame: WorkflowValueBinding = {
  from: "input",
  name: "lastFrame",
  index: 0,
  to: "lastFrame",
}

type Graph = Record<string, unknown>

type Patch = (graph: Graph) => Graph

const keepGraph: Patch = (graph) => graph

function soundPatch(sound: Sound): Patch {
  return sound === "on" ? keepGraph : (graph) => withoutSound(graph, audioNode)
}

function ltxWorkflow(
  workflow: string,
  resolution: VideoResolution,
  sound: Sound,
  extra: readonly WorkflowValueBinding[],
  patch: Patch
): EngineBinding {
  const bindings = [...ltxBindings(resolution), ...extra]
  const bySound = soundPatch(sound)
  return workflowBinding({
    workflow,
    bindings,
    outputsPerJob,
    patch: (graph) => bySound(patch(graph)),
  })
}

export function ltxTextBinding(
  resolution: VideoResolution,
  sound: Sound
): EngineBinding {
  return ltxWorkflow(
    videoWorkflows["ltx-2-5-text"],
    resolution,
    sound,
    [],
    keepGraph
  )
}

export function ltxStartFrameBinding(
  resolution: VideoResolution,
  sound: Sound
): EngineBinding {
  return ltxWorkflow(
    videoWorkflows["ltx-2-5-start-frame"],
    resolution,
    sound,
    [startFrame],
    withoutLastFrame
  )
}

export function ltxFirstLastBinding(
  resolution: VideoResolution,
  sound: Sound
): EngineBinding {
  return ltxWorkflow(
    videoWorkflows["ltx-2-5-start-frame"],
    resolution,
    sound,
    [startFrame, lastFrame],
    keepGraph
  )
}

function byResolution(
  bind: (resolution: VideoResolution, sound: Sound) => EngineBinding
): EngineBinding {
  const bySound = (resolution: VideoResolution): EngineBinding =>
    selectBinding({
      input: "sound",
      options: { on: bind(resolution, "on"), off: bind(resolution, "off") },
    })
  return selectBinding({
    input: "resolution",
    options: { "480p": bySound("480p"), "720p": bySound("720p") },
  })
}

export const videoEngine: EngineBinding = selectBinding({
  input: "startFrame",
  by: "filled",
  options: {
    filled: selectBinding({
      input: "lastFrame",
      by: "filled",
      options: {
        filled: byResolution(ltxFirstLastBinding),
        empty: byResolution(ltxStartFrameBinding),
      },
    }),
    empty: byResolution(ltxTextBinding),
  },
})
