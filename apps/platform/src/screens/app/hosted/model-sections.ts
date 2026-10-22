import {
  type CatalogModel,
  isOpenWeights,
  type ModelFacts,
  type ModelTag,
} from "@rosesfield/catalog/comfy"

export type SectionRow = {
  id: string
  name: string
  maker: string
  task: string
  tags: readonly ModelTag[]
  facts: ModelFacts | undefined
}

export type ModelSection = {
  id: "featured" | "all"
  rows: readonly SectionRow[]
}

const rowTags: readonly ModelTag["kind"][] = [
  "resolution",
  "length",
  "sound",
  "open-weights",
  "proven",
]

export function rowOf(model: CatalogModel, name: string): SectionRow {
  return {
    id: model.id,
    name,
    maker: model.maker,
    task: model.task,
    tags: model.tags.filter((tag) => rowTags.includes(tag.kind)),
    facts: model.facts,
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
  const featured = ranBeforeOf([...firstIds]).flatMap((id) => {
    const model = byId.get(id)
    return model === undefined ? [] : [rowOf(model, nameOf(model))]
  })
  const all = [
    ...models.filter(isOpenWeights),
    ...models.filter((model) => !isOpenWeights(model)),
  ].map((model) => rowOf(model, nameOf(model)))
  const sections: ModelSection[] = [
    { id: "featured", rows: featured },
    { id: "all", rows: all },
  ]
  return sections.filter((section) => section.rows.length > 0)
}
