import type { EngineBinding } from "@rosesfield/contract"
import {
  framesFor,
  heldSecondsFor,
  latentSizeMap,
  lengthMap,
  sizeMap,
} from "#lipsync/comfy/lipsync-frames"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

export const photoWorkflow = "lipsync-photo-ltx-2-3"

export function photoBindings(): WorkflowValueBinding[] {
  return [
    { from: "input", name: "photo", index: 0, to: "photo" },
    { from: "input", name: "audio", index: 0, to: "audio" },
    { from: "input", name: "scene", to: "scene" },
    { from: "seed", to: "seed" },
    { from: "aspectRatio", map: sizeMap("width"), to: "width" },
    { from: "aspectRatio", map: sizeMap("height"), to: "height" },
    { from: "aspectRatio", map: latentSizeMap("width"), to: "latentWidth" },
    { from: "aspectRatio", map: latentSizeMap("height"), to: "latentHeight" },
    { from: "aspectRatio", map: sizeMap("width"), to: "maskWidth" },
    { from: "aspectRatio", map: sizeMap("height"), to: "maskHeight" },
    { from: "input", name: "length", map: lengthMap(framesFor), to: "frames" },
    {
      from: "input",
      name: "length",
      map: lengthMap(heldSecondsFor),
      to: "seconds",
    },
  ]
}

export const photoBinding: EngineBinding = workflowBinding({
  workflow: photoWorkflow,
  bindings: photoBindings(),
  outputsPerJob: "one",
})
