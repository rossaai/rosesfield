import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import {
  type ModelValue,
  modelValues,
  type PhotoInput,
  photoInputs,
  referenceLimits,
} from "#ads/ads-values"
import {
  type ApiGraph,
  promptBindings,
  promptPatch,
} from "#ads/comfy/ads-prompts"
import { sizeBindings } from "#ads/comfy/ads-sizes"
import {
  qwenSizeTargets,
  qwenSlots,
  qwenWorkflow,
} from "#ads/comfy/qwen-edit-workflow"
import { AppDefinitionInvalidError } from "#app-definition-invalid.error"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"
import { apiGraph } from "#workflow-entry.contract"

type ModelGraph = {
  workflow: string
  slots: (graph: ApiGraph, used: number) => ApiGraph
  sizes: readonly (readonly [string, string])[]
}

const modelGraphs: Readonly<Record<ModelValue, ModelGraph>> = {
  "qwen-image-edit-2511": {
    workflow: qwenWorkflow,
    slots: qwenSlots,
    sizes: qwenSizeTargets,
  },
}

type Variant = {
  model: ModelValue
  photos: number
  hasPerson: boolean
}

function referencesOf(variant: Variant): WorkflowValueBinding[] {
  const sources: string[] = [
    ...photoInputs.slice(0, variant.photos),
    ...(variant.hasPerson ? ["character"] : []),
  ]
  return sources.map((name, slot) => ({
    from: "input",
    name,
    index: 0,
    to: `reference${slot + 1}`,
  }))
}

export function variantBinding(variant: Variant): EngineBinding | null {
  const used = variant.photos + (variant.hasPerson ? 1 : 0)
  if (used > referenceLimits[variant.model]) {
    return null
  }
  const { workflow, slots, sizes } = modelGraphs[variant.model]
  return workflowBinding({
    workflow,
    bindings: [
      ...promptBindings,
      ...referencesOf(variant),
      { from: "seed", to: "seed" },
      ...sizes.flatMap(([width, height]) => sizeBindings(width, height)),
    ],
    outputsPerJob: "one",
    patch: (source) =>
      promptPatch(
        slots(apiGraph.parse(source), used),
        workflow,
        variant.hasPerson
      ),
  })
}

function filledOrEmpty(
  input: string,
  build: (isFilled: boolean) => EngineBinding | null
): EngineBinding | null {
  const options: Record<string, EngineBinding> = {}
  const filled = build(true)
  const empty = build(false)
  if (filled !== null) {
    options.filled = filled
  }
  if (empty !== null) {
    options.empty = empty
  }
  return Object.keys(options).length === 0
    ? null
    : selectBinding({ input, by: "filled", options })
}

function byPhotos(model: ModelValue, photos: number): EngineBinding | null {
  const next: PhotoInput | undefined = photoInputs[photos]
  const byCharacter = (): EngineBinding | null =>
    filledOrEmpty("character", (hasPerson) =>
      variantBinding({ model, photos, hasPerson })
    )
  if (next === undefined) {
    return byCharacter()
  }
  return filledOrEmpty(next, (isFilled) =>
    isFilled ? byPhotos(model, photos + 1) : byCharacter()
  )
}

function required(binding: EngineBinding | null): EngineBinding {
  if (binding === null) {
    throw new AppDefinitionInvalidError({
      folder: "ads",
      reason: "a model it lists binds no workflow",
    })
  }
  return binding
}

export const adsBinding: EngineBinding = selectBinding({
  input: "model",
  options: Object.fromEntries(
    modelValues.map((model) => [model, required(byPhotos(model, 1))])
  ),
})
