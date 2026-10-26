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
  task: string | null
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

export const featuredLimit = 3

export type RankCandidate = { id: string; rank: number | null }

export function rankedModelsOf(
  defaultId: string | null,
  candidates: readonly RankCandidate[]
): string[] {
  const isListed = candidates.some((one) => one.id === defaultId)
  const head = defaultId !== null && isListed ? [defaultId] : []
  const byBoard = candidates
    .flatMap((one) =>
      one.rank === null || one.id === defaultId
        ? []
        : [{ id: one.id, rank: one.rank }]
    )
    .sort((a, b) => a.rank - b.rank)
    .map((one) => one.id)
  const rest = candidates.map((one) => one.id)
  return ranBeforeOf([...head, ...byBoard, ...rest]).slice(0, featuredLimit)
}

export function rankedCatalogOf(
  defaultId: string | null,
  models: readonly CatalogModel[]
): string[] {
  return rankedModelsOf(
    defaultId,
    models.map((model) => ({
      id: model.id,
      rank: model.facts?.rank?.position ?? null,
    }))
  )
}

export function modelSections(
  models: readonly CatalogModel[],
  rankedIds: readonly string[],
  nameOf: (model: CatalogModel) => string
): ModelSection[] {
  const byId = new Map(models.map((model) => [model.id, model]))
  const featured = ranBeforeOf([...rankedIds]).flatMap((id) => {
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
