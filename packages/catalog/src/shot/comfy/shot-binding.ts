import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { findWorkflow, type Workflow, type WorkflowTarget } from "#list-workflows"
import {
  autoValue,
  phraseOf,
  type ShotList,
  sceneEnd,
  shotListOrder,
  shotLists,
} from "#shot/shot-words"
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
  type VideoWorkflowName,
  videoWorkflows,
  withoutLastFrame,
  withoutSound,
} from "#video/comfy/video-workflows"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"
import { apiGraph } from "#workflow-entry.contract"
import { WorkflowInvalidError } from "#workflow-invalid.error"

type Sound = "on" | "off"
type Side = keyof FrameSize
type ValueMap = Record<string, string | number>
type Graph = Record<string, unknown>
type Patch = (graph: Graph) => Graph

export const shotResolutions = [
  "480p",
  "720p",
] as const satisfies readonly VideoResolution[]

const promptNode = "900"

const audioNode = "370"

const sceneNodes = { trim: "950", period: "951" } as const

const phraseNodes: Readonly<Record<ShotList, string>> = {
  movement: "952",
  camera: "953",
  lens: "954",
  focus: "955",
  light: "956",
  color: "957",
  mood: "958",
}

const sides: readonly Side[] = ["width", "height"]

const firstPassDivisor = 2

function invalid(folder: string, reason: string): WorkflowInvalidError {
  return new WorkflowInvalidError({ folder, reason })
}

function targetOf(nodeId: string, inputName: string): WorkflowTarget {
  return {
    nodeId,
    inputName,
    type: "scalar",
    path: [nodeId, "inputs", inputName],
  }
}

function concat(after: string, words: string): Record<string, unknown> {
  return {
    class_type: "StringConcatenate",
    inputs: { string_a: [after, 0], string_b: words, delimiter: "" },
  }
}

type WordNodes = { nodes: Record<string, unknown>; last: string }

function wordNodes(): WordNodes {
  const nodes: Record<string, unknown> = {
    [sceneNodes.trim]: {
      class_type: "StringTrim",
      inputs: { string: "", mode: "Both" },
    },
    [sceneNodes.period]: {
      class_type: "RegexReplace",
      inputs: {
        string: [sceneNodes.trim, 0],
        regex_pattern: sceneEnd.source,
        replace: ".",
        case_insensitive: false,
        multiline: false,
        dotall: false,
        count: 1,
      },
    },
  }
  let after: string = sceneNodes.period
  for (const list of shotListOrder) {
    nodes[phraseNodes[list]] = concat(after, "")
    after = phraseNodes[list]
  }
  return { nodes, last: after }
}

export function withShotWords(workflow: Workflow): Workflow {
  const graph = apiGraph.parse(structuredClone(workflow.graph))
  const prompt = graph[promptNode]
  if (prompt?.class_type !== "StringConcatenate") {
    throw invalid(workflow.id, `node ${promptNode} joins no prompt`)
  }
  const added = wordNodes()
  const taken = Object.keys(added.nodes).find((id) => Object.hasOwn(graph, id))
  if (taken !== undefined) {
    throw invalid(workflow.id, `it already holds node ${taken}`)
  }
  const joined = {
    ...prompt,
    inputs: { ...prompt.inputs, string_a: [added.last, 0], string_b: "" },
  }
  const phraseTargets = Object.fromEntries(
    shotListOrder.map((list) => [list, targetOf(phraseNodes[list], "string_b")])
  )
  const { cameraMove: _, ...inputs } = workflow.inputs
  return {
    ...workflow,
    graph: { ...graph, [promptNode]: joined, ...added.nodes },
    inputs: {
      ...inputs,
      prompt: targetOf(sceneNodes.trim, "string"),
      ...phraseTargets,
    },
  }
}

function findShotWorkflow(id: string): Workflow | null {
  const workflow = findWorkflow(id)
  return workflow === null ? null : withShotWords(workflow)
}

function phraseMap(list: ShotList): ValueMap {
  const values = [autoValue, ...shotLists[list]]
  return Object.fromEntries(
    values.map((value) => [value, phraseOf(list, value)])
  )
}

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

function shotBindings(resolution: VideoResolution): WorkflowValueBinding[] {
  return [
    { from: "input", name: "prompt", to: "prompt" },
    ...shotListOrder.map(
      (list): WorkflowValueBinding => ({
        from: "input",
        name: list,
        map: phraseMap(list),
        to: list,
      })
    ),
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

const keepGraph: Patch = (graph) => graph

function soundPatch(sound: Sound): Patch {
  return sound === "on" ? keepGraph : (graph) => withoutSound(graph, audioNode)
}

type ShotGraph = {
  workflow: VideoWorkflowName
  extra: readonly WorkflowValueBinding[]
  patch: Patch
}

const textGraph: ShotGraph = {
  workflow: "ltx-2-5-text",
  extra: [],
  patch: keepGraph,
}

const startFrameGraph: ShotGraph = {
  workflow: "ltx-2-5-start-frame",
  extra: [startFrame],
  patch: withoutLastFrame,
}

function shotGraphBinding(
  graph: ShotGraph,
  resolution: VideoResolution,
  sound: Sound
): EngineBinding {
  const bySound = soundPatch(sound)
  return workflowBinding({
    workflow: videoWorkflows[graph.workflow],
    bindings: [...shotBindings(resolution), ...graph.extra],
    outputsPerJob: "one",
    patch: (one) => bySound(graph.patch(one)),
    find: findShotWorkflow,
  })
}

function byResolution(graph: ShotGraph): EngineBinding {
  const bySound = (resolution: VideoResolution): EngineBinding =>
    selectBinding({
      input: "sound",
      options: {
        on: shotGraphBinding(graph, resolution, "on"),
        off: shotGraphBinding(graph, resolution, "off"),
      },
    })
  return selectBinding({
    input: "resolution",
    options: Object.fromEntries(
      shotResolutions.map((resolution) => [resolution, bySound(resolution)])
    ),
  })
}

export const shotGraphs: EngineBinding = selectBinding({
  input: "startFrame",
  by: "filled",
  options: {
    filled: byResolution(startFrameGraph),
    empty: byResolution(textGraph),
  },
})
