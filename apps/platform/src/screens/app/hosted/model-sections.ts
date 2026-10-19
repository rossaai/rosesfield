import type { CatalogModel, ModelTag } from "@rosesfield/catalog/comfy"

export type SectionRow = {
  id: string
  name: string
  maker: string
  task: string
  tags: readonly ModelTag[]
}

export type ModelSection = {
  id: string
  label: string | null
  rows: readonly SectionRow[]
}

const rowTags: readonly ModelTag["kind"][] = [
  "resolution",
  "length",
  "sound",
  "open-weights",
]

export function rowOf(model: CatalogModel, name: string): SectionRow {
  return {
    id: model.id,
    name,
    maker: model.maker,
    task: model.task,
    tags: model.tags.filter((tag) => rowTags.includes(tag.kind)),
  }
}

export function ranBeforeOf(models: readonly (string | undefined)[]): string[] {
  const seen = new Set<string>()
  return models.filter((model): model is string => {
    if (model === undefined || seen.has(model)) {
      return false
    }
    seen.add(model)
    return true
  })
}

export function modelSections(
  models: readonly CatalogModel[],
  firstIds: readonly string[],
  nameOf: (model: CatalogModel) => string
): ModelSection[] {
  const byId = new Map(models.map((model) => [model.id, model]))
  const first = ranBeforeOf([...firstIds]).flatMap((id) => {
    const model = byId.get(id)
    return model === undefined ? [] : [rowOf(model, nameOf(model))]
  })
  const makers = new Map<string, SectionRow[]>()
  for (const model of models) {
    const rows = makers.get(model.maker) ?? []
    rows.push(rowOf(model, nameOf(model)))
    makers.set(model.maker, rows)
  }
  const grouped = [...makers.entries()].map(([maker, rows]) => ({
    id: maker,
    label: maker,
    rows,
  }))
  return first.length === 0
    ? grouped
    : [{ id: "first", label: null, rows: first }, ...grouped]
}
