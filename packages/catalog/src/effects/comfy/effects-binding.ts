import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import {
  effectGraph,
  effectsWorkflow,
  type Sound,
} from "#effects/comfy/effect-graph"
import { type EffectValue, effectValues } from "#effects/comfy/effect-prompts"
import { effectsWithSound, recipeOf } from "#effects/comfy/effect-recipes"
import {
  ltxFrames,
  type ResolutionValue,
  resolutionValues,
  sizeMap,
} from "#effects/comfy/frame-sizes"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

function runBindings(resolution: ResolutionValue): WorkflowValueBinding[] {
  const sizes = ltxFrames.sizes[resolution]
  return [
    { from: "input", name: "image", index: 0, to: "photo" },
    { from: "input", name: "prompt", to: "detail" },
    { from: "seed", to: "seed" },
    { from: "input", name: "length", map: ltxFrames.frames, to: "frames" },
    { from: "input", name: "length", map: ltxFrames.frames, to: "audioFrames" },
    { from: "aspectRatio", map: sizeMap(sizes, "width", 2), to: "width" },
    { from: "aspectRatio", map: sizeMap(sizes, "height", 2), to: "height" },
  ]
}

function endFrameBindings(resolution: ResolutionValue): WorkflowValueBinding[] {
  const sizes = ltxFrames.sizes[resolution]
  return [
    { from: "seed", to: "endFrameSeed" },
    {
      from: "aspectRatio",
      map: sizeMap(sizes, "width", 1),
      to: "endFrameWidth",
    },
    {
      from: "aspectRatio",
      map: sizeMap(sizes, "height", 1),
      to: "endFrameHeight",
    },
  ]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

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
  return [...files].sort()
}

export function effectBinding(
  effect: EffectValue,
  sound: Sound,
  resolution: ResolutionValue
): EngineBinding {
  const recipe = recipeOf(effect)
  const usesEndFrame = recipe.endFrame.source === "ic-lora"
  const binding = workflowBinding({
    workflow: effectsWorkflow,
    bindings: [
      ...runBindings(resolution),
      ...(usesEndFrame ? endFrameBindings(resolution) : []),
    ],
    patch: (graph) => effectGraph(graph, effect, recipe, sound),
  })
  return {
    ...binding,
    config: {
      ...binding.config,
      models: loadedModels(binding.config.workflow),
    },
  }
}

function byResolution(effect: EffectValue, sound: Sound): EngineBinding {
  return selectBinding({
    input: "resolution",
    options: Object.fromEntries(
      resolutionValues.map((resolution) => [
        resolution,
        effectBinding(effect, sound, resolution),
      ])
    ),
  })
}

function bindingOf(effect: EffectValue): EngineBinding {
  if (!effectsWithSound.includes(effect)) {
    return byResolution(effect, "off")
  }
  return selectBinding({
    input: "sound",
    options: {
      on: byResolution(effect, "on"),
      off: byResolution(effect, "off"),
    },
  })
}

export const effectsBinding: EngineBinding = selectBinding({
  input: "effect",
  options: Object.fromEntries(
    effectValues.map((effect) => [effect, bindingOf(effect)])
  ),
})
