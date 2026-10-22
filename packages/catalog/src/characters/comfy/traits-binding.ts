import type { EngineBinding } from "@rosesfield/contract"
import { comfyWorkflowAdapter } from "@rosesfield/generation/bindings"
import { traitWords } from "#characters/comfy/traits-prompt"
import type { SizeTable } from "#image/comfy/image-sizes"
import {
  type ImageModel,
  imageModels,
  referenceModel,
  resolutionsOf,
} from "#image/image-models"
import { apiGraph } from "#workflow-entry.contract"
import { WorkflowInvalidError } from "#workflow-invalid.error"

type PromptTarget = { node: string; field: string }

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isPromptBinding(binding: unknown): boolean {
  return (
    isRecord(binding) &&
    binding.from === "input" &&
    binding.name === promptInput
  )
}

function promptTargetOf(binding: unknown): PromptTarget | null {
  if (!isRecord(binding) || !isPromptBinding(binding)) {
    return null
  }
  const { path } = binding
  return Array.isArray(path) &&
    path.length === 3 &&
    typeof path[0] === "string" &&
    path[1] === "inputs" &&
    typeof path[2] === "string"
    ? { node: path[0], field: path[2] }
    : null
}

export function traitsBinding(model: ImageModel): EngineBinding {
  const fail = (reason: string) =>
    new WorkflowInvalidError({ folder: model.workflow, reason })
  const image = model.bind(smallestSizesOf(model))
  const graph = apiGraph.safeParse(image.config.workflow)
  const bindings = Array.isArray(image.config.bindings)
    ? image.config.bindings
    : []
  if (image.adapter !== comfyWorkflowAdapter || !graph.success) {
    throw fail("Image binds this model to no single workflow")
  }
  const prompts = bindings
    .map(promptTargetOf)
    .filter((one): one is PromptTarget => one !== null)
  const [prompt] = prompts
  if (prompt === undefined || prompts.length !== 1) {
    throw fail("Characters writes the prompt, which Image binds to no one node")
  }
  const words = traitWords()
  const taken = Object.keys(words.nodes).find((id) =>
    Object.hasOwn(graph.data, id)
  )
  if (taken !== undefined) {
    throw fail(`Characters adds node ${taken}, which the graph already holds`)
  }
  const node = graph.data[prompt.node]
  if (node === undefined) {
    throw fail(`the prompt names node ${prompt.node}, which the graph lacks`)
  }
  node.inputs[prompt.field] = words.output
  return {
    adapter: image.adapter,
    config: {
      ...image.config,
      workflow: { ...graph.data, ...words.nodes },
      bindings: [
        ...words.bindings,
        ...bindings.filter((binding) => !isPromptBinding(binding)),
      ],
    },
  }
}
