import {
  type ModelFacts,
  type ScoreSource,
  type TaskScore,
  taskScoreOf,
} from "@rosesfield/catalog/comfy"
import type { Run } from "@rosesfield/contract"

export type RankedModel = {
  id: string
  task: string | null
  facts?: ModelFacts | undefined
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

export function mainTaskOf(
  models: readonly { task: string | null }[]
): string | null {
  const counts = new Map<string | null, number>()
  for (const model of models) {
    counts.set(model.task, (counts.get(model.task) ?? 0) + 1)
  }
  const [first] = [...counts.entries()].sort((a, b) => b[1] - a[1])
  return first === undefined ? null : first[0]
}

function placeOf(score: TaskScore | null): number {
  return score === null ? Number.POSITIVE_INFINITY : score.order
}

export function topOrderOf<T extends RankedModel>(
  models: readonly T[],
  mainTask: string | null
): T[] {
  return models
    .map((model, index) => ({
      model,
      index,
      main: placeOf(taskScoreOf(model.facts, mainTask)),
      own: placeOf(taskScoreOf(model.facts, model.task)),
    }))
    .sort((a, b) => a.main - b.main || a.own - b.own || a.index - b.index)
    .map((one) => one.model)
}

export function defaultIdOf(
  declared: string | null,
  models: readonly RankedModel[]
): string | null {
  if (declared !== null && models.some((model) => model.id === declared)) {
    return declared
  }
  return topOrderOf(models, mainTaskOf(models))[0]?.id ?? declared
}

export function taskBoardsOf(
  models: readonly RankedModel[],
  task: string | null
): ScoreSource[] {
  const boards = new Map<string, ScoreSource>()
  for (const model of models) {
    for (const source of taskScoreOf(model.facts, task)?.sources ?? []) {
      boards.set(source.board, source)
    }
  }
  return [...boards.values()]
}

const modelInputName = "model"

export function recentModelsOf(runs: readonly Run[]): string[] {
  const newestFirst = [...runs].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )
  return ranBeforeOf(
    newestFirst.map((run) => {
      const model = run.inputs[modelInputName]
      return typeof model === "string" && model !== "" ? model : undefined
    })
  )
}
