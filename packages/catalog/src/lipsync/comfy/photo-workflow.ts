import type { EngineBinding } from "@rosesfield/contract"
import {
  lengthMap,
  passCount,
  sizeMap,
  windowOf,
} from "#lipsync/comfy/lipsync-frames"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

export const photoWorkflow = "lipsync-photo-infinitetalk"

export function passNode(pass: number, part: number): string {
  return String(pass * 100 + part)
}

const passes = Array.from({ length: passCount }, (_, index) => index + 1)

function passBindings(pass: number): WorkflowValueBinding[] {
  return [
    { from: "seed", to: `seed${pass}` },
    { from: "aspectRatio", map: sizeMap("width"), to: `width${pass}` },
    { from: "aspectRatio", map: sizeMap("height"), to: `height${pass}` },
    {
      from: "input",
      name: "length",
      map: lengthMap(windowOf),
      to: `frames${pass}`,
    },
  ]
}

export function photoBindings(): WorkflowValueBinding[] {
  return [
    { from: "input", name: "photo", index: 0, to: "photo" },
    { from: "input", name: "audio", index: 0, to: "audio" },
    { from: "input", name: "scene", to: "scene" },
    ...passes.flatMap(passBindings),
    {
      from: "input",
      name: "length",
      map: lengthMap((frames) => frames),
      to: "length",
    },
  ]
}

export const photoBinding: EngineBinding = workflowBinding({
  workflow: photoWorkflow,
  bindings: photoBindings(),
})
