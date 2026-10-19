import type { EngineBinding } from "@rosesfield/contract"
import { lengthMap, sizeMap } from "#lipsync/comfy/lipsync-frames"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

export const clipWorkflow = "lipsync-clip-infinitetalk"

const frames = lengthMap((count) => count)

export function clipBindings(): WorkflowValueBinding[] {
  return [
    { from: "input", name: "clip", index: 0, to: "clip" },
    { from: "input", name: "audio", index: 0, to: "audio" },
    { from: "seed", to: "seed" },
    { from: "aspectRatio", map: sizeMap("width"), to: "resizeWidth" },
    { from: "aspectRatio", map: sizeMap("height"), to: "resizeHeight" },
    { from: "aspectRatio", map: sizeMap("width"), to: "width" },
    { from: "aspectRatio", map: sizeMap("height"), to: "height" },
    { from: "input", name: "length", map: frames, to: "frames" },
    { from: "input", name: "length", map: frames, to: "length" },
  ]
}

export const clipBinding: EngineBinding = workflowBinding({
  workflow: clipWorkflow,
  bindings: clipBindings(),
})
