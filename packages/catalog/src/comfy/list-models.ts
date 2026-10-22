import type { AppDefinition, InputDefinition } from "@rosesfield/contract"
import {
  chosenModelOf,
  graphTaskOf,
  type HostedModel,
  isHostedModelId,
  taskAdapter,
  tasksOf,
} from "@rosesfield/generation/bindings"
import type { CatalogModel, ModelTag } from "#comfy/model-catalog.contract"
import { isDeniedModel } from "#comfy/model-deny"
import { factsOf } from "#comfy/model-facts"
import { makerOf, nameOf } from "#comfy/model-names"
import { hostedTagsOf } from "#comfy/model-tags"
import { namedTasksOf, tasksOfModel } from "#comfy/model-tasks"
import { isProvenFamily } from "#comfy/proven-families"

export const graphMaker = "comfy-cloud"

const modelInputName = "model"

export function appTasksOf(app: AppDefinition): readonly string[] {
  return tasksOf(app.engine)
}

export function defaultModelOf(app: AppDefinition): string | null {
  return app.engine.adapter === taskAdapter
    ? chosenModelOf(app.engine, {})
    : null
}

export function isOpenWeights(model: CatalogModel): boolean {
  return model.tags.some((tag) => tag.kind === "open-weights")
}

function byMakerThenName(a: CatalogModel, b: CatalogModel): number {
  return a.maker.localeCompare(b.maker) || a.name.localeCompare(b.name)
}

export function modelsForApp(
  app: AppDefinition,
  hosted: readonly HostedModel[]
): CatalogModel[] {
  const tasks = appTasksOf(app)
  if (tasks.length === 0) {
    return ownGraphOf(app)
  }
  const listed = hosted.flatMap((model) => {
    const task = appTaskOf(model, tasks, app.output.kind)
    return task === undefined || isDeniedModel(model.id)
      ? []
      : [hostedEntry(model, task)]
  })
  const sorted = listed.sort(byMakerThenName)
  return [
    ...graphsOf(app, tasks[0] ?? ""),
    ...sorted.filter(isOpenWeights),
    ...sorted.filter((model) => !isOpenWeights(model)),
  ]
}

function appTaskOf(
  model: HostedModel,
  tasks: readonly string[],
  media: string
): string | undefined {
  const listed = (one: string): boolean => tasks.includes(one)
  return (
    namedTasksOf(model, media).find(listed) ??
    tasksOfModel(model, media).find(listed)
  )
}

function hostedEntry(model: HostedModel, task: string): CatalogModel {
  const facts = factsOf(model.id, task)
  const tags: ModelTag[] = hostedTagsOf(model)
  if (facts.weights !== null) {
    tags.push({ kind: "open-weights" })
  }
  if (isProvenFamily(model.provider)) {
    tags.push({ kind: "proven" })
  }
  return {
    id: model.id,
    kind: "hosted",
    maker: makerOf(model.provider),
    name: nameOf(model.id),
    nameKey: null,
    task,
    tags,
    form: model.form === null ? null : [...model.form.fields],
    facts,
  }
}

function ownGraphOf(app: AppDefinition): CatalogModel[] {
  const graph = defaultModelOf(app)
  return graph === null ||
    isHostedModelId(graph) ||
    isDeniedModel(`graph/${graph}`)
    ? []
    : [graphEntry(graph, null, null)]
}

function graphsOf(app: AppDefinition, appTask: string): CatalogModel[] {
  const input = app.inputs.find(
    (one): one is Extract<InputDefinition, { type: "choice" }> =>
      one.name === modelInputName && one.type === "choice"
  )
  return (input?.options ?? [])
    .filter((option) => !isHostedModelId(option.value))
    .filter((option) => !isDeniedModel(`graph/${option.value}`))
    .map((option) =>
      graphEntry(
        option.value,
        option.labelKey,
        graphTaskOf(app.engine, option.value) ?? appTask
      )
    )
}

function graphEntry(
  value: string,
  labelKey: string | null,
  task: string | null
): CatalogModel {
  const facts = factsOf(`graph/${value}`, task)
  return {
    id: value,
    kind: "graph",
    maker: facts.lab ?? graphMaker,
    name: nameOf(`graph/${value}`),
    nameKey: labelKey,
    task,
    tags: [{ kind: "open-weights" }],
    form: null,
    facts,
  }
}
