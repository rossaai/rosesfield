import type { CatalogModel } from "@rosesfield/catalog/comfy"

export type ModelKind = CatalogModel["kind"]

const kindOrder: readonly ModelKind[] = ["graph", "hosted"]

export function kindsOf(models: readonly CatalogModel[]): ModelKind[] {
  return kindOrder.filter((kind) => models.some((model) => model.kind === kind))
}

export function shownKindOf(
  models: readonly CatalogModel[],
  chosen: CatalogModel | null
): ModelKind | null {
  const kinds = kindsOf(models)
  if (chosen !== null && kinds.includes(chosen.kind)) {
    return chosen.kind
  }
  return kinds[0] ?? null
}

export function modelsOfKind(
  models: readonly CatalogModel[],
  kind: ModelKind | null
): CatalogModel[] {
  return kind === null
    ? [...models]
    : models.filter((model) => model.kind === kind)
}

export function modelForKind(
  models: readonly CatalogModel[],
  chosen: CatalogModel | null,
  kind: ModelKind
): string | null {
  if (chosen?.kind === kind) {
    return null
  }
  return models.find((model) => model.kind === kind)?.id ?? null
}
