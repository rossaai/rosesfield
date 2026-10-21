import type { AppDefinition, InputDefinition } from "@rosesfield/contract"
import {
  chosenModelOf,
  graphTaskOf,
  type HostedModel,
  isHostedModelId,
  taskAdapter,
  tasksOf,
} from "@rosesfield/generation/bindings"
import type { CatalogModel } from "#comfy/model-catalog.contract"
import { isDeniedModel } from "#comfy/model-deny"
import { makerOf, nameOf } from "#comfy/model-names"
import { hostedTagsOf } from "#comfy/model-tags"
import { tasksOfModel } from "#comfy/model-tasks"
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

export function modelsForApp(
  app: AppDefinition,
  hosted: readonly HostedModel[]
): CatalogModel[] {
  const tasks = appTasksOf(app)
  if (tasks.length === 0) {
    return []
  }
  const listed = hosted.flatMap((model) => {
    const task = tasksOfModel(model).find((one) => tasks.includes(one))
    return task === undefined || isDeniedModel(model.id)
      ? []
      : [hostedEntry(model, task)]
  })
  const sorted = listed.sort(
    (a, b) => a.maker.localeCompare(b.maker) || a.name.localeCompare(b.name)
  )
  return [...graphsOf(app, tasks[0] ?? ""), ...sorted]
}

function hostedEntry(model: HostedModel, task: string): CatalogModel {
  return {
    id: model.id,
    kind: "hosted",
    maker: makerOf(model.provider),
    name: nameOf(model.id),
    nameKey: null,
    task,
    tags: isProvenFamily(model.provider)
      ? [...hostedTagsOf(model), { kind: "proven" }]
      : hostedTagsOf(model),
    form: model.form === null ? null : [...model.form.fields],
  }
}

function graphsOf(app: AppDefinition, appTask: string): CatalogModel[] {
  const input = app.inputs.find(
    (one): one is Extract<InputDefinition, { type: "choice" }> =>
      one.name === modelInputName && one.type === "choice"
  )
  return (input?.options ?? [])
    .filter((option) => !isHostedModelId(option.value))
    .filter((option) => !isDeniedModel(`graph/${option.value}`))
    .map((option) => ({
      id: option.value,
      kind: "graph",
      maker: graphMaker,
      name: nameOf(`graph/${option.value}`),
      nameKey: option.labelKey,
      task: graphTaskOf(app.engine, option.value) ?? appTask,
      tags: [{ kind: "open-weights" }],
      form: null,
    }))
}
