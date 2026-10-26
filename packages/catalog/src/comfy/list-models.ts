import type {
  AppDefinition,
  EngineBinding,
  InputDefinition,
} from "@rosesfield/contract"
import {
  chosenModelOf,
  graphTaskOf,
  type HostedModel,
  isHostedModelId,
  partnerNodesOf,
  selectAdapter,
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

type ModelOption = Extract<
  InputDefinition,
  { type: "choice" }
>["options"][number]

function modelOptionsOf(app: AppDefinition): readonly ModelOption[] {
  const input = app.inputs.find(
    (one): one is Extract<InputDefinition, { type: "choice" }> =>
      one.name === modelInputName && one.type === "choice"
  )
  return input?.options ?? []
}

function ownGraphOf(app: AppDefinition): CatalogModel[] {
  const graph = defaultModelOf(app)
  if (
    graph === null ||
    isHostedModelId(graph) ||
    isDeniedModel(`graph/${graph}`)
  ) {
    return []
  }
  const option = modelOptionsOf(app).find((one) => one.value === graph)
  return [
    graphEntry(graph, option?.labelKey ?? null, {
      task: null,
      isOpen: !runsPartnerNode(app, graph),
    }),
  ]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isBinding(value: unknown): value is EngineBinding {
  return (
    isRecord(value) &&
    typeof value.adapter === "string" &&
    isRecord(value.config)
  )
}

function leavesOf(binding: EngineBinding, graph: string): EngineBinding[] {
  const { config } = binding
  if (binding.adapter === taskAdapter) {
    return isBinding(config.fallback) ? leavesOf(config.fallback, graph) : []
  }
  if (binding.adapter !== selectAdapter) {
    return [binding]
  }
  const options = isRecord(config.options) ? config.options : {}
  const isPicked =
    config.input === modelInputName && Object.hasOwn(options, graph)
  const picked = isPicked ? [options[graph]] : Object.values(options)
  return picked.flatMap((one) => (isBinding(one) ? leavesOf(one, graph) : []))
}

export function runsPartnerNode(app: AppDefinition, graph: string): boolean {
  return leavesOf(app.engine, graph).some(
    (leaf) => partnerNodesOf(leaf).length > 0
  )
}

function graphsOf(app: AppDefinition, appTask: string): CatalogModel[] {
  return modelOptionsOf(app)
    .filter((option) => !isHostedModelId(option.value))
    .filter((option) => !isDeniedModel(`graph/${option.value}`))
    .map((option) =>
      graphEntry(option.value, option.labelKey, {
        task: graphTaskOf(app.engine, option.value) ?? appTask,
        isOpen: !runsPartnerNode(app, option.value),
      })
    )
}

function graphEntry(
  value: string,
  labelKey: string | null,
  graph: { task: string | null; isOpen: boolean }
): CatalogModel {
  const { task } = graph
  const facts = factsOf(`graph/${value}`, task)
  const tags: ModelTag[] = graph.isOpen ? [{ kind: "open-weights" }] : []
  return {
    id: value,
    kind: "graph",
    maker: facts.lab ?? graphMaker,
    name: nameOf(`graph/${value}`),
    nameKey: labelKey,
    task,
    tags,
    form: null,
    facts,
  }
}
