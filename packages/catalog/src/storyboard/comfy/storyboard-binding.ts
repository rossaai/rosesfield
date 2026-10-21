import type { EngineBinding } from "@rosesfield/contract"
import {
  comfyWorkflowAdapter,
  refusedBinding,
  selectBinding,
} from "@rosesfield/generation/bindings"
import { zImageTurbo } from "#image/comfy/open-weights"
import { type TextPass, textPassOf } from "#storyboard/comfy/keyframe-from-text"
import { keyframeSizes, sideMap } from "#storyboard/comfy/keyframe-sizes"
import { editNodes, type Link } from "#storyboard/comfy/storyboard-nodes"
import {
  maxScenes,
  type StoryboardModel,
  sceneInputName,
  sceneNumbers,
  storyboardModels,
} from "#storyboard/storyboard-inputs"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"
import { apiGraph } from "#workflow-entry.contract"
import { WorkflowInvalidError } from "#workflow-invalid.error"

type ApiGraph = ReturnType<typeof apiGraph.parse>

const editWorkflow = "storyboard-qwen-image-edit-2511"

const sizes: readonly WorkflowValueBinding[] = [
  { from: "aspectRatio", map: sideMap("width"), to: "width" },
  { from: "aspectRatio", map: sideMap("height"), to: "height" },
]

function countMap(first: Link): Record<string, Link> {
  const ends: Record<string, Link> = { "1": first }
  for (let count = 2; count <= maxScenes; count += 1) {
    ends[String(count)] = [String(900 + count), 0]
  }
  return ends
}

function sceneBindings(): WorkflowValueBinding[] {
  return sceneNumbers.flatMap((scene): WorkflowValueBinding[] => [
    { from: "input", name: sceneInputName(scene), to: `scene${scene}` },
    { from: "input", name: "look", to: `look${scene}` },
  ])
}

function sharedBindings(first: Link): WorkflowValueBinding[] {
  return [
    { from: "seed", to: "seed" },
    ...sizes,
    ...sceneBindings(),
    { from: "count", map: countMap(first), to: "count" },
  ]
}

function anchoredBinding(anchor: "reference" | "character"): EngineBinding {
  return workflowBinding({
    workflow: editWorkflow,
    bindings: [
      { from: "input", name: anchor, index: 0, to: "anchor" },
      ...sharedBindings([editNodes.firstKeyframe, 0]),
    ],
  })
}

function nodeAt(graph: ApiGraph, id: string): ApiGraph[string] {
  const node = graph[id]
  if (node === undefined) {
    throw new WorkflowInvalidError({
      folder: editWorkflow,
      reason: `the keyframe patch needs node ${id}`,
    })
  }
  return node
}

function fromTextPatch(graph: ApiGraph, pass: TextPass): ApiGraph {
  const first = pass.keyframe
  delete graph[editNodes.anchor]
  for (const id of editNodes.firstEdit) {
    delete graph[id]
  }
  nodeAt(graph, editNodes.anchorScale).inputs.image = first
  nodeAt(graph, editNodes.firstBatch).inputs.image1 = first
  nodeAt(graph, editNodes.firstKeep).inputs = {
    string_a: "",
    string_b: "",
    delimiter: "",
  }
  return { ...graph, ...pass.nodes }
}

function stringsOf(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((one): one is string => typeof one === "string")
    : []
}

function splicedKeyframe(text: EngineBinding): EngineBinding {
  const pass = textPassOf({
    binding: text,
    wires: {
      prompt: [editNodes.firstPrompt, 0],
      seed: [editNodes.seed, 0],
      latent: [editNodes.latent, 0],
    },
    folder: editWorkflow,
  })
  const binding = workflowBinding({
    workflow: editWorkflow,
    bindings: sharedBindings(pass.keyframe),
    patch: (graph) => fromTextPatch(apiGraph.parse(graph), pass),
  })
  const models = [...pass.models, ...stringsOf(binding.config.models)]
  return {
    ...binding,
    config: { ...binding.config, models: [...new Set(models)] },
  }
}

export function keyframeBindingOf(text: () => EngineBinding): EngineBinding {
  try {
    return splicedKeyframe(text())
  } catch (error) {
    if (error instanceof WorkflowInvalidError) {
      return refusedBinding({
        adapter: comfyWorkflowAdapter,
        reason: error.message,
      })
    }
    throw error
  }
}

function keyframeBinding(): EngineBinding {
  return keyframeBindingOf(() => zImageTurbo(keyframeSizes))
}

function byAnchor(): EngineBinding {
  return selectBinding({
    input: "reference",
    by: "filled",
    options: {
      filled: anchoredBinding("reference"),
      empty: selectBinding({
        input: "character",
        by: "filled",
        options: {
          filled: anchoredBinding("character"),
          empty: keyframeBinding(),
        },
      }),
    },
  })
}

const bindings: Readonly<Record<StoryboardModel, () => EngineBinding>> = {
  "qwen-image-edit-2511": byAnchor,
}

export const storyboardBinding: EngineBinding = selectBinding({
  input: "model",
  options: Object.fromEntries(
    storyboardModels.map((model) => [model, bindings[model]()])
  ),
})
