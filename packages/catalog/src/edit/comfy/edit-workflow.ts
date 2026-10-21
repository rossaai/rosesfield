import type { EngineBinding } from "@rosesfield/contract"
import { megapixelsOf } from "#edit/edit-models"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

export const editWorkflow = "edit-qwen-image-edit-2511"

const bindings: readonly WorkflowValueBinding[] = [
  { from: "input", name: "image", index: 0, to: "image" },
  { from: "input", name: "prompt", to: "prompt" },
  {
    from: "input",
    name: "resolution",
    map: { ...megapixelsOf },
    to: "megapixels",
  },
  { from: "seed", to: "seed" },
]

export const editBinding: EngineBinding = workflowBinding({
  workflow: editWorkflow,
  bindings,
  outputsPerJob: "one",
})
