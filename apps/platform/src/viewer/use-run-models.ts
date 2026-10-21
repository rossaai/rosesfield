import {
  type CatalogModel,
  isHostedModelId,
  type ModelField,
} from "@rosesfield/catalog/comfy"
import type { Run } from "@rosesfield/contract"
import { useQuery } from "@tanstack/react-query"
import { settingsQuery } from "@/api/queries"
import { modelInputName } from "@/screens/app/hosted/hosted-form"
import { modelCatalogQuery } from "@/screens/app/hosted/model-catalog-query"

function hostedModelOf(run: Run | null): string | null {
  const model = run?.inputs[modelInputName]
  return typeof model === "string" && isHostedModelId(model) ? model : null
}

export function runFieldsOf(
  run: Run,
  models: readonly CatalogModel[]
): readonly ModelField[] | null {
  const id = hostedModelOf(run)
  return models.find((one) => one.id === id)?.form ?? null
}

export function useRunModels(run: Run | null): readonly CatalogModel[] {
  const isHosted = hostedModelOf(run) !== null
  const settings = useQuery({ ...settingsQuery, enabled: isHosted })
  const catalog = useQuery({
    ...modelCatalogQuery(
      run?.appId ?? "",
      settings.data?.engine.key ?? "unknown"
    ),
    enabled: isHosted && settings.data !== undefined,
  })
  return catalog.data?.models ?? []
}
