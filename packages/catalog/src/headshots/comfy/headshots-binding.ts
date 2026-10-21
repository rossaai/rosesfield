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
      reason: `Headshot sends its words to the input ${name}, which its input map lacks`,
    })
  }
  return target
}

function wordedGraph(edit: Workflow): Record<string, unknown> {
  const graph = apiGraph.parse(structuredClone(edit.graph))
  let previous: string | [string, number] = leadWords
  for (const word of wordNodes) {
    if (Object.hasOwn(graph, word.node)) {
      throw new WorkflowInvalidError({
        folder: edit.id,
        reason: `Headshot adds node ${word.node}, which the graph already holds`,
      })
    }
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
  const [node, , field] = targetOf(edit, "prompt").path
  const prompt = graph[node]
  if (prompt === undefined) {
    throw new WorkflowInvalidError({
      folder: edit.id,
      reason: `its prompt names node ${node}, which the graph lacks`,
    })
  }
  prompt.inputs[field] = previous
  return graph
}

function sizeBindings(edit: Workflow): ComfyValueBinding[] {
  const width = Object.hasOwn(edit.inputs, "width")
  const height = Object.hasOwn(edit.inputs, "height")
  if (!width || !height) {
    return []
  }
  return [
    {
      from: "aspectRatio",
      map: sideMap("width"),
      path: [...targetOf(edit, "width").path],
    },
    {
      from: "aspectRatio",
      map: sideMap("height"),
      path: [...targetOf(edit, "height").path],
    },
  ]
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
      ...sizeBindings(edit),
    ],
    models: [...edit.models],
    outputsPerJob: "one",
  })
}
