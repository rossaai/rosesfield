import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { effectGraph, hasEditPass } from "#effects/comfy/effect-graph"
import { deliveryFrames, ltxFrames, sizeMap } from "#effects/comfy/frame-sizes"
import { effectsWorkflow } from "#effects/comfy/graph-edit"
import { guideWorkflow, shortSides } from "#motion/comfy/motion-binding"
import {
  type ExampleGuide,
  type LibraryExample,
  type ResolutionValue,
  resolutionValues,
} from "#motion/examples/library-example.contract"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

function runBindings(
  example: LibraryExample,
  resolution: ResolutionValue
): WorkflowValueBinding[] {
  const sizes = ltxFrames.sizes[resolution]
  const delivery = deliveryFrames[resolution]
  return [
    { from: "input", name: photoInput, index: 0, to: "photo" },
    { from: "input", name: sentenceInput, to: "detail" },
    { from: "seed", to: "seed" },
    { from: "aspectRatio", map: sizeMap(sizes, "width", 2), to: "width" },
    { from: "aspectRatio", map: sizeMap(sizes, "height", 2), to: "height" },
    { from: "aspectRatio", map: sizeMap(sizes, "width"), to: "fitWidth" },
    { from: "aspectRatio", map: sizeMap(sizes, "height"), to: "fitHeight" },
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
    { from: "seed", to: "grainSeed" },
    ...(hasEditPass(example)
      ? [{ from: "seed", to: "endFrameSeed" } as const]
      : []),
    ...(example.design.sound?.hits ?? []).map(
      (_, index) => ({ from: "seed", to: `hitSeed${index + 1}` }) as const
    ),
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
  example: LibraryExample,
  resolution: ResolutionValue
): EngineBinding {
  const binding = workflowBinding({
    workflow: effectsWorkflow,
    bindings: runBindings(example, resolution),
    patch: (graph) => effectGraph(graph, example),
  })
  return {
    ...binding,
    config: {
      ...binding.config,
      models: loadedModels(binding.config.workflow),
    },
  }
}

function byResolution(example: LibraryExample): EngineBinding {
  return selectBinding({
    input: "resolution",
    options: Object.fromEntries(
      resolutionValues.map((resolution) => [
        resolution,
        effectBinding(example, resolution),
      ])
    ),
  })
}

export const exampleInput = "example"

export const ownVideo = "own"

export const photoInput = "photo"

export const sentenceInput = "scene"

export function guidedRender(
  example: LibraryExample,
  guide: ExampleGuide
): EngineBinding {
  return workflowBinding({
    workflow: guideWorkflow,
    bindings: [
      { from: "input", name: photoInput, index: 0, to: "photo" },
      { from: "file", name: guide.file, to: "clip" },
      {
        from: "input",
        name: exampleInput,
        map: { [example.id]: example.prompt },
        to: "scene",
      },
      { from: "input", name: "resolution", map: shortSides, to: "shortSide" },
      { from: "seed", to: "seed" },
    ],
  })
}

export function exampleBinding(example: LibraryExample): EngineBinding {
  return example.guide === null
    ? byResolution(example)
    : guidedRender(example, example.guide)
}

export function examplesBinding(
  offered: readonly LibraryExample[],
  own: EngineBinding | null = null
): EngineBinding {
  return selectBinding({
    input: exampleInput,
    options: {
      ...(own === null ? {} : { [ownVideo]: own }),
      ...Object.fromEntries(
        offered.map((example) => [example.id, exampleBinding(example)])
      ),
    },
  })
}
