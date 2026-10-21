import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { effectGraph, effectsWorkflow } from "#effects/comfy/effect-graph"
import {
  deliveryFrames,
  fitFrames,
  ltxFrames,
  sizeMap,
} from "#effects/comfy/frame-sizes"
import {
  type EffectRecipe,
  type ResolutionValue,
  resolutionValues,
} from "#effects/effect-recipe.contract"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

function runBindings(
  recipe: EffectRecipe,
  resolution: ResolutionValue
): WorkflowValueBinding[] {
  const sizes = ltxFrames.sizes[resolution]
  const delivery = deliveryFrames[resolution]
  return [
    { from: "input", name: "image", index: 0, to: "photo" },
    { from: "input", name: "prompt", to: "detail" },
    { from: "seed", to: "seed" },
    { from: "seed", to: "fitSeed" },
    { from: "aspectRatio", map: sizeMap(sizes, "width", 2), to: "width" },
    { from: "aspectRatio", map: sizeMap(sizes, "height", 2), to: "height" },
    { from: "aspectRatio", map: sizeMap(fitFrames, "width"), to: "fitWidth" },
    {
      from: "aspectRatio",
      map: sizeMap(fitFrames, "height"),
      to: "fitHeight",
    },
    {
      from: "aspectRatio",
      map: sizeMap(delivery, "width"),
      to: "deliveryWidth",
    },
    {
      from: "aspectRatio",
      map: sizeMap(delivery, "height"),
      to: "deliveryHeight",
    },
    ...(recipe.endFrame.source === "none"
      ? []
      : [{ from: "seed", to: "endFrameSeed" } as const]),
  ]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const videoGuider = "LTXVDualCFGGuider"
const maxModelLinks = 8

function inputsOf(node: unknown): Record<string, unknown> {
  return isRecord(node) && isRecord(node.inputs) ? node.inputs : {}
}

function linkedNode(
  graph: Record<string, unknown>,
  value: unknown
): unknown | undefined {
  return Array.isArray(value) && typeof value[0] === "string"
    ? graph[value[0]]
    : undefined
}

function videoModelOf(graph: Record<string, unknown>): string | null {
  const guider = Object.values(graph).find(
    (node) => isRecord(node) && node.class_type === videoGuider
  )
  let node = linkedNode(graph, inputsOf(guider).model)
  for (let step = 0; step < maxModelLinks && node !== undefined; step += 1) {
    const { unet_name: file, model } = inputsOf(node)
    if (typeof file === "string") {
      return file
    }
    node = linkedNode(graph, model)
  }
  return null
}

export function loadedModels(graph: unknown): string[] {
  const nodes = isRecord(graph) ? graph : {}
  const files = new Set<string>()
  for (const node of Object.values(nodes)) {
    for (const value of Object.values(inputsOf(node))) {
      if (typeof value === "string" && value.endsWith(".safetensors")) {
        files.add(value)
      }
    }
  }
  const video = videoModelOf(nodes)
  if (video === null) {
    return [...files].sort()
  }
  files.delete(video)
  return [video, ...[...files].sort()]
}

export function effectBinding(
  recipe: EffectRecipe,
  resolution: ResolutionValue
): EngineBinding {
  const binding = workflowBinding({
    workflow: effectsWorkflow,
    bindings: runBindings(recipe, resolution),
    patch: (graph) => effectGraph(graph, recipe),
  })
  return {
    ...binding,
    config: {
      ...binding.config,
      models: loadedModels(binding.config.workflow),
    },
  }
}

function byResolution(recipe: EffectRecipe): EngineBinding {
  return selectBinding({
    input: "resolution",
    options: Object.fromEntries(
      resolutionValues.map((resolution) => [
        resolution,
        effectBinding(recipe, resolution),
      ])
    ),
  })
}

export function effectsBinding(
  offered: readonly EffectRecipe[]
): EngineBinding {
  return selectBinding({
    input: "effect",
    options: Object.fromEntries(
      offered.map((recipe) => [recipe.effect, byResolution(recipe)])
    ),
  })
}
