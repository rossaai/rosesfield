import type { AppListing } from "@rosesfield/contract"
import { useEffect, useMemo } from "react"
import { textOf } from "@/screens/app/fields/field-props"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  keptInputsOf,
  promptNameOf,
  traitsModelsOf,
} from "@/studio/characters/mode-listing"
import { traitsWords } from "@/studio/characters/traits-words"

export function useTraitsModel(
  app: AppListing,
  form: AppForm,
  hosted: HostedState | undefined
): HostedState | undefined {
  const models = hosted?.models
  const traitsModels = useMemo(() => traitsModelsOf(models ?? []), [models])
  const fields = hosted?.fields ?? null
  const promptName = hosted === undefined ? null : promptNameOf(app, fields)
  const words = traitsWords(form.values.inputs)
  const held =
    promptName === null ? null : textOf(form.values.inputs[promptName])
  const { setInput } = form
  useEffect(() => {
    if (promptName !== null && held !== words) {
      setInput(promptName, words)
    }
  }, [promptName, held, words, setInput])
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
