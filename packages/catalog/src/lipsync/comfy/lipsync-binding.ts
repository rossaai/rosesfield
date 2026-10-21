import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding, taskBinding } from "@rosesfield/generation/bindings"
import { photoBinding } from "#lipsync/comfy/photo-workflow"
import { defaultModel, lipsyncTasks } from "#lipsync/lipsync-models"

export const lipsyncBinding: EngineBinding = taskBinding({
  tasks: lipsyncTasks,
  input: "model",
  default: defaultModel,
  fallback: selectBinding({
    input: "mode",
    options: { photo: photoBinding },
  }),
})
