import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding, taskBinding } from "@rosesfield/generation/bindings"
import { anglesSetBinding } from "#characters/comfy/angles-binding"
import { portraitModels, traitsBinding } from "#characters/comfy/traits-binding"
import { graphModel } from "#edit/edit-models"
import { defaultModel } from "#image/image-models"

const portraitTask = "text-to-image"

const anglesTask = "image-edit"

export const anglesModel = graphModel

export const portraitDefault = defaultModel

export function charactersEngine(): EngineBinding {
  const portraits = portraitModels.map((model) => model.value)
  return taskBinding({
    tasks: [portraitTask, anglesTask],
    input: "model",
    default: portraitDefault,
    fallback: selectBinding({
      input: "model",
      options: {
        ...Object.fromEntries(
          portraitModels.map((model) => [model.value, traitsBinding(model)])
        ),
        [anglesModel]: anglesSetBinding(),
      },
    }),
    graphTasks: {
      ...Object.fromEntries(portraits.map((model) => [model, portraitTask])),
      [anglesModel]: anglesTask,
    },
  })
}
