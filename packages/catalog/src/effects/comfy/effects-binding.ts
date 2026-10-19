import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { effectGraph, effectsWorkflow } from "#effects/comfy/effect-graph"
import { ltxFrames, sizeMap } from "#effects/comfy/frame-sizes"
import {
  type EffectRecipe,
  type ResolutionValue,
  resolutionValues,
} from "#effects/effect-recipe.contract"
import { effectRecipes } from "#effects/effect-recipes"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

function runBindings(
  recipe: EffectRecipe,
  resolution: ResolutionValue
): WorkflowValueBinding[] {
  const sizes = ltxFrames.sizes[resolution]
  return [
    { from: "input", name: "image", index: 0, to: "photo" },
    { from: "input", name: "prompt", to: "detail" },
    { from: "seed", to: "seed" },
    { from: "aspectRatio", map: sizeMap(sizes, "width", 2), to: "width" },
    { from: "aspectRatio", map: sizeMap(sizes, "height", 2), to: "height" },
    ...(recipe.endFrame.source === "none"
      ? []
      : [{ from: "seed", to: "endFrameSeed" } as const]),
  ]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export const videoModel =
  "ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors"

export function loadedModels(graph: unknown): string[] {
  const files = new Set<string>()
  for (const node of Object.values(isRecord(graph) ? graph : {})) {
    const inputs = isRecord(node) && isRecord(node.inputs) ? node.inputs : {}
    for (const value of Object.values(inputs)) {
      if (typeof value === "string" && value.endsWith(".safetensors")) {
        files.add(value)
      }
    }
  }
  files.delete(videoModel)
  return [videoModel, ...[...files].sort()]
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

export const effectsBinding: EngineBinding = selectBinding({
  input: "effect",
  options: Object.fromEntries(
    effectRecipes.map((recipe) => [recipe.effect, byResolution(recipe)])
  ),
})
