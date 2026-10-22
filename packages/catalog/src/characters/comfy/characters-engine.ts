import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding, taskBinding } from "@rosesfield/generation/bindings"
import { angleSetBinding } from "#angles/comfy/angles-workflows"
import { viewDistance } from "#characters/angle-sets"
import { portraitModels, traitsBinding } from "#characters/comfy/traits-binding"
import { graphModel } from "#edit/edit-models"
import { defaultModel } from "#image/image-models"

const portraitTask = "text-to-image"

const anglesTask = "image-edit"

const characterInput = "character"

export const anglesModel = graphModel

export const portraitDefault = defaultModel

function portraitsBinding(): EngineBinding {
  return selectBinding({
    input: "model",
    options: Object.fromEntries(
      portraitModels.map((model) => [model.value, traitsBinding(model)])
    ),
  })
}

export function charactersEngine(): EngineBinding {
  const portraits = portraitModels.map((model) => model.value)
  return taskBinding({
    tasks: [portraitTask, anglesTask],
    input: "model",
    default: portraitDefault,
    fallback: selectBinding({
      input: characterInput,
      by: "filled",
      options: {
        empty: portraitsBinding(),
        filled: angleSetBinding({
          source: characterInput,
          distance: viewDistance,
        }),
      },
    }),
    graphTasks: {
      ...Object.fromEntries(portraits.map((model) => [model, portraitTask])),
      [anglesModel]: anglesTask,
    },
  })
}
