import type { EngineBinding } from "@rosesfield/contract"
import { type TraitWords, traitWords } from "#characters/comfy/traits-prompt"
import { heightsOf, type SizeTable, widthsOf } from "#image/comfy/image-sizes"
import {
  type ImageModel,
  imageModels,
  referenceModel,
  resolutionsOf,
} from "#image/image-models"
import { findWorkflow, type Workflow } from "#list-workflows"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"
import { apiGraph } from "#workflow-entry.contract"
import { WorkflowInvalidError } from "#workflow-invalid.error"

type Find = (id: string) => Workflow | null

const promptInput = "prompt"

export const portraitModels: readonly ImageModel[] = imageModels.filter(
  (model) => model.value !== referenceModel
)

export function smallestSizesOf(model: ImageModel): SizeTable {
  const [smallest] = resolutionsOf(model)
  const table = smallest === undefined ? undefined : model.sizes[smallest]
  if (table === undefined) {
    throw new WorkflowInvalidError({
      folder: model.workflow,
      reason: "Image lists no size for this model",
    })
  }
  return table
}

type SizeTargets = {
  widths: readonly string[]
  heights: readonly string[]
}

const plainSize: SizeTargets = { widths: ["width"], heights: ["height"] }

const sizeTargets: Readonly<Record<string, SizeTargets>> = {
  "image-z-image-turbo": plainSize,
  "image-qwen-image-2512": plainSize,
  "image-ming-image-0-1-design": {
    widths: ["width", "samplingWidth"],
    heights: ["height", "samplingHeight"],
  },
}

function valueBindings(
  model: ImageModel,
  sizes: SizeTable
): WorkflowValueBinding[] {
  const targets = Object.hasOwn(sizeTargets, model.workflow)
    ? sizeTargets[model.workflow]
    : undefined
  if (targets === undefined) {
    throw new WorkflowInvalidError({
      folder: model.workflow,
      reason: "Characters names no size targets for this graph",
    })
  }
  const widths = widthsOf(sizes)
  const heights = heightsOf(sizes)
  return [
    { from: "seed", to: "seed" },
    { from: "count", to: "count" },
    ...targets.widths.map(
      (to): WorkflowValueBinding => ({ from: "aspectRatio", map: widths, to })
    ),
    ...targets.heights.map(
      (to): WorkflowValueBinding => ({ from: "aspectRatio", map: heights, to })
    ),
  ]
}

function wordedWorkflow(workflow: Workflow, words: TraitWords): Workflow {
  const { [promptInput]: prompt, ...inputs } = workflow.inputs
  if (prompt === undefined) {
    throw new WorkflowInvalidError({
      folder: workflow.id,
      reason: "Characters writes the prompt, which its input map lacks",
    })
  }
  const graph = apiGraph.parse(structuredClone(workflow.graph))
  const taken = Object.keys(words.nodes).find((id) => Object.hasOwn(graph, id))
  if (taken !== undefined) {
    throw new WorkflowInvalidError({
      folder: workflow.id,
      reason: `Characters adds node ${taken}, which the graph already holds`,
    })
  }
  const [nodeId, , field] = prompt.path
  const node = graph[nodeId]
  if (node === undefined) {
    throw new WorkflowInvalidError({
      folder: workflow.id,
      reason: `the prompt names node ${nodeId}, which the graph lacks`,
    })
  }
  node.inputs[field] = words.output
  return {
    ...workflow,
    graph: { ...graph, ...words.nodes },
    inputs: { ...inputs, ...words.targets },
  }
}

export function traitsBinding(
  model: ImageModel,
  find: Find = findWorkflow
): EngineBinding {
  const workflow = find(model.workflow)
  if (workflow === null) {
    throw new WorkflowInvalidError({
      folder: model.workflow,
      reason: "no folder of workflows/ holds it",
    })
  }
  const words = traitWords()
  const values = valueBindings(model, smallestSizesOf(model))
  const worded = wordedWorkflow(workflow, words)
  return workflowBinding({
    workflow: worded.id,
    bindings: [...words.bindings, ...values],
    find: () => worded,
  })
}
