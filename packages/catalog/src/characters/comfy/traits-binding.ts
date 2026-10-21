import type { EngineBinding } from "@rosesfield/contract"
import {
  type ComfyValueBinding,
  comfyWorkflow,
} from "@rosesfield/generation/bindings"
import { type TraitWords, traitWords } from "#characters/comfy/traits-prompt"
import { heightsOf, type SizeTable, widthsOf } from "#image/comfy/image-sizes"
import {
  type ImageModel,
  imageModels,
  referenceModel,
  resolutionsOf,
} from "#image/image-models"
import {
  findWorkflow,
  type Workflow,
  type WorkflowTarget,
} from "#list-workflows"
import { apiGraph } from "#workflow-entry.contract"
import { WorkflowInvalidError } from "#workflow-invalid.error"

type Find = (id: string) => Workflow | null

const promptInput = "prompt"

export const portraitModels: readonly ImageModel[] = imageModels.filter(
  (model) => model.value !== referenceModel
)

function imageWorkflowOf(model: string): string {
  return `image-${model}`
}

export function smallestSizesOf(model: ImageModel): SizeTable {
  const [smallest] = resolutionsOf(model)
  const table = smallest === undefined ? undefined : model.sizes[smallest]
  if (table === undefined) {
    throw new WorkflowInvalidError({
      folder: imageWorkflowOf(model.value),
      reason: "Image lists no size for this model",
    })
  }
  return table
}

function isSide(name: string, side: "width" | "height"): boolean {
  const upper = `${side.charAt(0).toUpperCase()}${side.slice(1)}`
  return name === side || name.endsWith(upper)
}

function valueBinding(
  workflow: Workflow,
  name: string,
  target: WorkflowTarget,
  sizes: SizeTable
): ComfyValueBinding | null {
  const path = [...target.path]
  if (name === promptInput) {
    return null
  }
  if (name === "seed") {
    return { from: "seed", path }
  }
  if (name === "count") {
    return { from: "count", path }
  }
  if (isSide(name, "width")) {
    return { from: "aspectRatio", map: widthsOf(sizes), path }
  }
  if (isSide(name, "height")) {
    return { from: "aspectRatio", map: heightsOf(sizes), path }
  }
  throw new WorkflowInvalidError({
    folder: workflow.id,
    reason: `Characters fills no input named ${name}`,
  })
}

function promptTargetOf(workflow: Workflow): WorkflowTarget {
  const target = Object.hasOwn(workflow.inputs, promptInput)
    ? workflow.inputs[promptInput]
    : undefined
  if (target === undefined) {
    throw new WorkflowInvalidError({
      folder: workflow.id,
      reason: "Characters writes the prompt, which its input map lacks",
    })
  }
  return target
}

function wordedGraph(
  workflow: Workflow,
  words: TraitWords
): Record<string, unknown> {
  const graph = apiGraph.parse(structuredClone(workflow.graph))
  for (const added of Object.keys(words.nodes)) {
    if (Object.hasOwn(graph, added)) {
      throw new WorkflowInvalidError({
        folder: workflow.id,
        reason: `Characters adds node ${added}, which the graph already holds`,
      })
    }
  }
  const [nodeId, , field] = promptTargetOf(workflow).path
  const prompt = graph[nodeId]
  if (prompt === undefined) {
    throw new WorkflowInvalidError({
      folder: workflow.id,
      reason: `the prompt names node ${nodeId}, which the graph lacks`,
    })
  }
  prompt.inputs[field] = words.output
  return { ...graph, ...words.nodes }
}

export function traitsBinding(
  model: ImageModel,
  find: Find = findWorkflow
): EngineBinding {
  const id = imageWorkflowOf(model.value)
  const workflow = find(id)
  if (workflow === null) {
    throw new WorkflowInvalidError({
      folder: id,
      reason: "no folder of workflows/ holds it",
    })
  }
  const words = traitWords()
  const sizes = smallestSizesOf(model)
  const values = Object.entries(workflow.inputs).flatMap(([name, target]) => {
    const binding = valueBinding(workflow, name, target, sizes)
    return binding === null ? [] : [binding]
  })
  return comfyWorkflow({
    workflow: wordedGraph(workflow, words),
    bindings: [...words.bindings, ...values],
    models: [...workflow.models],
  })
}
