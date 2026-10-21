import type { EngineBinding } from "@rosesfield/contract"
import {
  type ComfyValueBinding,
  comfyWorkflow,
} from "@rosesfield/generation/bindings"
import {
  backgroundWords,
  clothesWords,
  framingWords,
  glassesWords,
  leadWords,
} from "#headshots/comfy/headshot-words"
import { headshotSizes } from "#headshots/headshots-values"
import {
  findWorkflow,
  type Workflow,
  type WorkflowTarget,
} from "#list-workflows"
import { apiGraph } from "#workflow-entry.contract"
import { WorkflowInvalidError } from "#workflow-invalid.error"

type Find = (id: string) => Workflow | null

type WordNode = {
  input: string
  node: string
  words: Readonly<Record<string, string>>
  delimiter: string
}

export const editWorkflowId = "edit-qwen-image-edit-2511"

export const wordNodes: readonly WordNode[] = [
  { input: "framing", node: "9201", words: framingWords, delimiter: " " },
  { input: "background", node: "9202", words: backgroundWords, delimiter: " " },
  { input: "clothes", node: "9203", words: clothesWords, delimiter: " " },
  {
    input: "keepGlasses",
    node: "9204",
    words: spaced(glassesWords),
    delimiter: "",
  },
]

function spaced(
  words: Readonly<Record<string, string>>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(words).map(([value, text]) => [
      value,
      text === "" ? "" : ` ${text}`,
    ])
  )
}

function sideMap(side: "width" | "height"): Record<string, number> {
  return Object.fromEntries(
    Object.entries(headshotSizes).map(([ratio, size]) => [ratio, size[side]])
  )
}

function targetOf(edit: Workflow, name: string): WorkflowTarget {
  const target = Object.hasOwn(edit.inputs, name)
    ? edit.inputs[name]
    : undefined
  if (target === undefined) {
    throw new WorkflowInvalidError({
      folder: edit.id,
      reason: `Headshot binds the input ${name}, which its input map lacks`,
    })
  }
  return target
}

export const sizeNode = "9205"

type ApiGraph = ReturnType<typeof apiGraph.parse>

function nodeOf(
  edit: Workflow,
  graph: ApiGraph,
  name: string
): [id: string, node: ApiGraph[string]] {
  const [id] = targetOf(edit, name).path
  const node = Object.hasOwn(graph, id) ? graph[id] : undefined
  if (node === undefined) {
    throw new WorkflowInvalidError({
      folder: edit.id,
      reason: `its ${name} names node ${id}, which the graph lacks`,
    })
  }
  return [id, node]
}

function isLinkTo(value: unknown, node: string): boolean {
  return Array.isArray(value) && value[0] === node && value[1] === 0
}

function wordedGraph(edit: Workflow): Record<string, unknown> {
  const graph = apiGraph.parse(structuredClone(edit.graph))
  for (const added of [...wordNodes.map((word) => word.node), sizeNode]) {
    if (Object.hasOwn(graph, added)) {
      throw new WorkflowInvalidError({
        folder: edit.id,
        reason: `Headshot adds node ${added}, which the graph already holds`,
      })
    }
  }
  let previous: string | [string, number] = leadWords
  for (const word of wordNodes) {
    graph[word.node] = {
      class_type: "StringConcatenate",
      inputs: {
        string_a: previous,
        string_b: "",
        delimiter: word.delimiter,
      },
    }
    previous = [word.node, 0]
  }
  const [, prompt] = nodeOf(edit, graph, "prompt")
  const [, , field] = targetOf(edit, "prompt").path
  prompt.inputs[field] = previous
  const [scaled] = nodeOf(edit, graph, "megapixels")
  for (const node of Object.values(graph)) {
    for (const [name, value] of Object.entries(node.inputs)) {
      if (isLinkTo(value, scaled)) {
        node.inputs[name] = [sizeNode, 0]
      }
    }
  }
  const square = headshotSizes["1:1"]
  graph[sizeNode] = {
    class_type: "ImageScale",
    inputs: {
      image: [scaled, 0],
      upscale_method: "lanczos",
      width: square.width,
      height: square.height,
      crop: "center",
    },
  }
  return graph
}

function sizeBindings(): ComfyValueBinding[] {
  return (["width", "height"] as const).map(
    (side): ComfyValueBinding => ({
      from: "aspectRatio",
      map: sideMap(side),
      path: [sizeNode, "inputs", side],
    })
  )
}

export function headshotsBinding(find: Find = findWorkflow): EngineBinding {
  const edit = find(editWorkflowId)
  if (edit === null) {
    throw new WorkflowInvalidError({
      folder: editWorkflowId,
      reason: "no folder of workflows/ holds it",
    })
  }
  const words = wordNodes.map(
    (word): ComfyValueBinding => ({
      from: "input",
      name: word.input,
      map: { ...word.words },
      path: [word.node, "inputs", "string_b"],
    })
  )
  return comfyWorkflow({
    workflow: wordedGraph(edit),
    bindings: [
      {
        from: "input",
        name: "image",
        index: 0,
        path: [...targetOf(edit, "image").path],
      },
      { from: "seed", path: [...targetOf(edit, "seed").path] },
      ...words,
      ...sizeBindings(),
    ],
    models: [...edit.models],
    outputsPerJob: "one",
  })
}
