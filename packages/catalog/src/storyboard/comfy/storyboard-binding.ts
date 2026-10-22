import { characterReferenceMax, type EngineBinding } from "@rosesfield/contract"
import {
  comfyWorkflowAdapter,
  refusedBinding,
  selectBinding,
  taskBinding,
} from "@rosesfield/generation/bindings"
import { editReferenceLimit } from "#image/comfy/open-weights"
import {
  type ImageModel,
  imageModels,
  openDefaultOf,
} from "#image/image-models"
import { type TextPass, textPassOf } from "#storyboard/comfy/keyframe-from-text"
import { keyframeSizes, sideMap } from "#storyboard/comfy/keyframe-sizes"
import {
  editNodes,
  keyframeDecodeOf,
  type Link,
  photoSlots,
} from "#storyboard/comfy/storyboard-nodes"
import {
  editModel,
  editTask,
  firstKeyframeInput,
  keyframeInput,
  sceneInputName,
  sceneNumbers,
  textTask,
} from "#storyboard/storyboard-inputs"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"
import { apiGraph } from "#workflow-entry.contract"
import { WorkflowInvalidError } from "#workflow-invalid.error"

type ApiGraph = ReturnType<typeof apiGraph.parse>

type Anchor = "reference" | "character" | typeof firstKeyframeInput

const editWorkflow = "storyboard-qwen-image-edit-2511"

const textModels: readonly ImageModel[] = imageModels.filter(
  (model) => model.value !== editModel
)

const textDefault = openDefaultOf(textModels)

export const keyframeTextModel: ImageModel | null =
  textModels.find((model) => model.value === textDefault) ?? null

const sizes: readonly WorkflowValueBinding[] = [
  { from: "aspectRatio", map: sideMap("width"), to: "width" },
  { from: "aspectRatio", map: sideMap("height"), to: "height" },
]

const keyframeOutputs: Readonly<Record<string, Link>> = Object.fromEntries(
  sceneNumbers.map((number): [string, Link] => [
    String(number),
    [keyframeDecodeOf(number), 0],
  ])
)

function sceneBindings(): WorkflowValueBinding[] {
  return sceneNumbers.flatMap((scene): WorkflowValueBinding[] => [
    { from: "input", name: sceneInputName(scene), to: `scene${scene}` },
    { from: "input", name: "look", to: `look${scene}` },
  ])
}

function sharedBindings(
  outputs: Readonly<Record<string, Link>>
): WorkflowValueBinding[] {
  return [
    { from: "seed", to: "seed" },
    ...sizes,
    ...sceneBindings(),
    { from: "input", name: keyframeInput, map: { ...outputs }, to: "count" },
  ]
}

function withPhotos(graph: ApiGraph, photos: number): ApiGraph {
  for (const slot of photoSlots.slice(Math.max(photos - 1, 0))) {
    delete graph[slot.node]
    for (const node of Object.values(graph)) {
      if (node.class_type === editNodes.encoderClass) {
        delete node.inputs[slot.input]
      }
    }
  }
  return graph
}

function anchoredBinding(anchor: Anchor, photos: number): EngineBinding {
  const slots = ["anchor", ...photoSlots.map((slot) => slot.to)]
  return workflowBinding({
    workflow: editWorkflow,
    bindings: [
      ...slots.slice(0, photos).map(
        (to, index): WorkflowValueBinding => ({
          from: "input",
          name: anchor,
          index,
          to,
        })
      ),
      ...sharedBindings(keyframeOutputs),
    ],
    patch: (graph) => withPhotos(apiGraph.parse(graph), photos),
  })
}

function byPhotoCount(): EngineBinding {
  const photos = Array.from(
    { length: characterReferenceMax },
    (_, index) => index + 1
  )
  return selectBinding({
    input: "character",
    by: "count",
    options: Object.fromEntries([
      ["0", anchoredBinding(firstKeyframeInput, 1)],
      ...photos.map((count) => [
        String(count),
        anchoredBinding("character", Math.min(count, editReferenceLimit)),
      ]),
    ]),
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
  withPhotos(graph, 0)
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
    bindings: sharedBindings({ "1": pass.keyframe }),
    patch: (graph) => fromTextPatch(apiGraph.parse(graph), pass),
  })
  const models = [...pass.models, ...stringsOf(binding.config.models)]
  return {
    ...binding,
    config: { ...binding.config, models: [...new Set(models)] },
  }
}

function refusedFrom(error: unknown): EngineBinding {
  if (error instanceof WorkflowInvalidError) {
    return refusedBinding({
      adapter: comfyWorkflowAdapter,
      reason: error.message,
    })
  }
  throw error
}

export function keyframeBindingOf(text: () => EngineBinding): EngineBinding {
  try {
    return splicedKeyframe(text())
  } catch (error) {
    return refusedFrom(error)
  }
}

function editByAnchor(): EngineBinding {
  return selectBinding({
    input: "reference",
    by: "filled",
    options: {
      filled: anchoredBinding("reference", 1),
      empty: byPhotoCount(),
    },
  })
}

function graphOptions(): Record<string, EngineBinding> {
  const options: Record<string, EngineBinding> = {
    [editModel]: editByAnchor(),
  }
  const text = keyframeTextModel
  if (text !== null) {
    options[text.value] = keyframeBindingOf(() => text.bind(keyframeSizes))
  }
  return options
}

export const storyboardEngine: EngineBinding = taskBinding({
  tasks: [editTask],
  input: "model",
  default: editModel,
  fallback: selectBinding({ input: "model", options: graphOptions() }),
  graphTasks:
    keyframeTextModel === null ? {} : { [keyframeTextModel.value]: textTask },
})
