import type { AppListing } from "@rosesfield/contract"
import { useMemo } from "react"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import { keptInputsOf, traitsModelsOf } from "@/studio/characters/mode-listing"

export function useTraitsModel(
  app: AppListing,
  form: AppForm,
  hosted: HostedState | undefined
): HostedState | undefined {
  const models = hosted?.models
  const traitsModels = useMemo(() => traitsModelsOf(models ?? []), [models])
  if (hosted === undefined) {
    return undefined
  }
  return {
    ...hosted,
    models: traitsModels,
    choose: (id) => {
      const next = traitsModels.find((model) => model.id === id)
      const kept = keptInputsOf(app, form.values.inputs, next)
      hosted.choose(id)
      for (const [name, value] of kept) {
        form.setInput(name, value)
      }
    },
  }
}
