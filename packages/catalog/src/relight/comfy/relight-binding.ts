import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { z } from "zod"
import {
  autoValue,
  brightnessPhraseOf,
  brightnessSteps,
  phraseOf,
  type RelightList,
  relightLists,
} from "#relight/relight-words"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"
import { apiGraph } from "#workflow-entry.contract"
import { WorkflowInvalidError } from "#workflow-invalid.error"

type Node = z.infer<typeof apiGraph>[string]

export type Workflow = Record<string, Node>

export const relightModels = [
  "qwen-image-edit-2509-relight",
  "qwen-image-edit-2511",
] as const

export type RelightModel = (typeof relightModels)[number]

export const relightQualities = ["draft", "final"] as const

export type RelightQuality = (typeof relightQualities)[number]

export const relightWorkflows: Readonly<Record<RelightModel, string>> = {
  "qwen-image-edit-2509-relight": "relight-qwen-image-edit-2509",
  "qwen-image-edit-2511": "relight-qwen-image-edit-2511",
}

export const relightSteps: Readonly<
  Record<RelightQuality, { steps: number; cfg: number; lightning: boolean }>
> = {
  draft: { steps: 4, cfg: 1, lightning: true },
  final: { steps: 40, cfg: 4, lightning: false },
}

export const relightNodes = {
  lightning: "6",
  sampler: "14",
} as const

const modelNames = z.array(z.string())

function isLinkTo(value: unknown, id: string): boolean {
  return Array.isArray(value) && value[0] === id
}

function nodeOf(workflow: Workflow, folder: string, id: string): Node {
  const node = workflow[id]
  if (node === undefined) {
    throw new WorkflowInvalidError({ folder, reason: `it has no node ${id}` })
  }
  return node
}

function withoutLightning(workflow: Workflow, folder: string): void {
  const source = nodeOf(workflow, folder, relightNodes.lightning).inputs.model
  delete workflow[relightNodes.lightning]
  for (const node of Object.values(workflow)) {
    if (isLinkTo(node.inputs.model, relightNodes.lightning)) {
      node.inputs.model = source
    }
  }
}

export function workflowFor(
  model: RelightModel,
  quality: RelightQuality,
  graph: Record<string, unknown>
): Workflow {
  const folder = relightWorkflows[model]
  const workflow: Workflow = apiGraph.parse(graph)
  const steps = relightSteps[quality]
  if (!steps.lightning) {
    withoutLightning(workflow, folder)
  }
  const sampler = nodeOf(workflow, folder, relightNodes.sampler)
  sampler.inputs.steps = steps.steps
  sampler.inputs.cfg = steps.cfg
  return workflow
}

export function modelsLoaded(
  models: readonly string[],
  workflow: Workflow
): string[] {
  const values = new Set(
    Object.values(workflow).flatMap((node) => Object.values(node.inputs))
  )
  return models.filter((name) => values.has(name))
}

function phraseMap(list: RelightList): Record<string, string> {
  const values = [autoValue, ...relightLists[list]]
  return Object.fromEntries(
    values.map((value) => [value, phraseOf(list, value)])
  )
}

function brightnessMap(): Record<string, string> {
  return Object.fromEntries(
    brightnessSteps.map((step) => [String(step), brightnessPhraseOf(step)])
  )
}

function phraseBindings(): WorkflowValueBinding[] {
  const lists: RelightList[] = ["direction", "softness", "color"]
  return lists.map((list) => ({
    from: "input",
    name: list,
    map: phraseMap(list),
    to: list,
  }))
}

export function relightBindings(): WorkflowValueBinding[] {
  return [
    { from: "input", name: "image", index: 0, to: "image" },
    ...phraseBindings(),
    {
      from: "input",
      name: "brightness",
      map: brightnessMap(),
      to: "brightness",
    },
    { from: "input", name: "prompt", to: "detail" },
    { from: "seed", to: "seed" },
  ]
}

function bindingFor(
  model: RelightModel,
  quality: RelightQuality
): EngineBinding {
  let sent: Workflow = {}
  const binding = workflowBinding({
    workflow: relightWorkflows[model],
    bindings: relightBindings(),
    outputsPerJob: "one",
    patch: (graph) => {
      sent = workflowFor(model, quality, graph)
      return sent
    },
  })
  const models = modelNames.parse(binding.config.models ?? [])
  return {
    ...binding,
    config: { ...binding.config, models: modelsLoaded(models, sent) },
  }
}

function byQuality(model: RelightModel): EngineBinding {
  return selectBinding({
    input: "quality",
    options: Object.fromEntries(
      relightQualities.map((quality) => [quality, bindingFor(model, quality)])
    ),
  })
}

export const relightBinding: EngineBinding = selectBinding({
  input: "model",
  options: Object.fromEntries(
    relightModels.map((model) => [model, byQuality(model)])
  ),
})
