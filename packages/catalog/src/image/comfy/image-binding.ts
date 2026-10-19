import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { type ImageModel, imageModels } from "#image/image-models"

function bindingOf(model: ImageModel): EngineBinding {
  const options: Record<string, EngineBinding> = {}
  for (const [resolution, table] of Object.entries(model.sizes)) {
    options[resolution] = model.bind(table)
  }
  return selectBinding({ input: "resolution", options })
}

export const imageBinding: EngineBinding = selectBinding({
  input: "model",
  options: Object.fromEntries(
    imageModels.map((model) => [model.value, bindingOf(model)])
  ),
})
