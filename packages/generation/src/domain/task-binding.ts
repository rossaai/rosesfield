import type { EngineBinding, RunInputs } from "@rosesfield/contract"
import { EngineBindingInvalidError } from "#domain/error/engine-binding-invalid.error"
import { isRecord } from "#domain/is-record"

type TaskConfig = {
  tasks: readonly string[]
  input: string
  default: string
  fallback: EngineBinding
  graphTasks?: Readonly<Record<string, string>>
}

export const taskAdapter = "task"

export const hostedModelAdapter = "hosted-model"

export function isHostedModelId(value: string): boolean {
  return /^[a-z0-9][a-z0-9_.-]*\/[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(value)
}

export function taskBinding(config: TaskConfig): EngineBinding {
  return {
    adapter: taskAdapter,
    config: {
      ...config,
      tasks: [...config.tasks],
      ...(config.graphTasks === undefined
        ? {}
        : { graphTasks: { ...config.graphTasks } }),
    },
  }
}

export function hostedModelBinding(model: string): EngineBinding {
  return { adapter: hostedModelAdapter, config: { model } }
}

export function hostedModelOf(binding: EngineBinding): string | null {
  const { model } = binding.config
  return binding.adapter === hostedModelAdapter && typeof model === "string"
    ? model
    : null
}

export function tasksOf(binding: EngineBinding): readonly string[] {
  if (binding.adapter !== taskAdapter) {
    return []
  }
  const { tasks } = binding.config
  return Array.isArray(tasks)
    ? tasks.filter((task): task is string => typeof task === "string")
    : []
}

export function taskInputOf(binding: EngineBinding): string | null {
  const { input } = binding.config
  return binding.adapter === taskAdapter && typeof input === "string"
    ? input
    : null
}

export function graphTaskOf(
  binding: EngineBinding,
  graph: string
): string | null {
  if (binding.adapter !== taskAdapter) {
    return null
  }
  const { graphTasks } = binding.config
  if (!isRecord(graphTasks) || !Object.hasOwn(graphTasks, graph)) {
    return null
  }
  const task = graphTasks[graph]
  return typeof task === "string" ? task : null
}

export function chosenModelOf(
  binding: EngineBinding,
  inputs: RunInputs
): string | null {
  if (binding.adapter !== taskAdapter) {
    return null
  }
  const config = taskConfigOf(binding)
  const value = inputs[config.input]
  return typeof value === "string" && value !== "" ? value : config.default
}

export type PickedTask = {
  binding: EngineBinding
  inputs: RunInputs
}

export function pickTask(
  binding: EngineBinding,
  inputs: RunInputs
): PickedTask {
  const config = taskConfigOf(binding)
  const model = chosenModelOf(binding, inputs) ?? config.default
  return {
    binding: isHostedModelId(model)
      ? hostedModelBinding(model)
      : config.fallback,
    inputs: { ...inputs, [config.input]: model },
  }
}

function taskConfigOf(binding: EngineBinding): TaskConfig {
  const { tasks, input, fallback } = binding.config
  const chosen = binding.config.default
  if (
    !Array.isArray(tasks) ||
    typeof input !== "string" ||
    typeof chosen !== "string" ||
    !isBinding(fallback)
  ) {
    throw new EngineBindingInvalidError({
      adapter: taskAdapter,
      reason:
        "a task binding needs its tasks, its input, a default and a fallback",
    })
  }
  return {
    tasks: tasks.filter((task): task is string => typeof task === "string"),
    input,
    default: chosen,
    fallback,
  }
}

function isBinding(value: unknown): value is EngineBinding {
  return (
    isRecord(value) &&
    typeof value.adapter === "string" &&
    isRecord(value.config)
  )
}
