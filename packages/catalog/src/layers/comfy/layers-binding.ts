import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import {
  editBinding,
  type Quality,
  relightBinding,
} from "#layers/comfy/edit-workflow"
import { fillBinding } from "#layers/comfy/fill-workflow"
import { splitBinding } from "#layers/comfy/split-workflow"

export const modeValues = ["split", "edit", "relight", "fill"] as const

export type LayersMode = (typeof modeValues)[number]

export const oneLayerModes: LayersMode[] = ["edit", "relight", "fill"]

export const layerCountValues = ["1", "2", "3", "4", "5", "6", "7", "8"]

export const defaultLayerCount = "4"

function byQuality(bindingFor: (quality: Quality) => EngineBinding) {
  return selectBinding({
    input: "quality",
    options: { draft: bindingFor("draft"), final: bindingFor("final") },
  })
}

export const layersBinding: EngineBinding = selectBinding({
  input: "mode",
  options: {
    split: byQuality(splitBinding),
    edit: byQuality(editBinding),
    relight: byQuality(relightBinding),
    fill: byQuality(fillBinding),
  },
})
