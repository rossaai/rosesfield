import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding, taskBinding } from "@rosesfield/generation/bindings"
import { editBinding, type Quality } from "#layers/comfy/edit-workflow"
import { fillBinding } from "#layers/comfy/fill-workflow"
import { relightBinding, relightGraph } from "#layers/comfy/relight-workflow"
import { splitBinding } from "#layers/comfy/split-workflow"

export const modeValues = ["split", "edit", "relight", "fill"] as const

export type LayersMode = (typeof modeValues)[number]

export const oneLayerModes: LayersMode[] = ["edit", "relight", "fill"]

export const layerCountValues = ["1", "2", "3", "4", "5", "6", "7", "8"]

export const defaultLayerCount = "4"

export const modeGraphs: Readonly<Record<LayersMode, string>> = {
  split: "qwen-image-layered",
  edit: "qwen-image-edit-2511",
  relight: relightGraph,
  fill: "qwen-image-inpaint",
}

export const modeTasks: Readonly<Record<LayersMode, string>> = {
  split: "layer-separation",
  edit: "image-edit",
  relight: "relight",
  fill: "image-edit",
}

export const layersTasks: readonly string[] = [
  ...new Set(modeValues.map((mode) => modeTasks[mode])),
]

const bindingsOf: Readonly<
  Record<LayersMode, (quality: Quality) => EngineBinding>
> = {
  split: splitBinding,
  edit: editBinding,
  relight: relightBinding,
  fill: fillBinding,
}

function byQuality(bindingFor: (quality: Quality) => EngineBinding) {
  return selectBinding({
    input: "quality",
    options: { draft: bindingFor("draft"), final: bindingFor("final") },
  })
}

export const layersBinding: EngineBinding = taskBinding({
  tasks: layersTasks,
  input: "model",
  default: modeGraphs.split,
  graphTasks: Object.fromEntries(
    modeValues.map((mode) => [modeGraphs[mode], modeTasks[mode]])
  ),
  fallback: selectBinding({
    input: "model",
    options: Object.fromEntries(
      modeValues.map((mode) => [modeGraphs[mode], byQuality(bindingsOf[mode])])
    ),
  }),
})
