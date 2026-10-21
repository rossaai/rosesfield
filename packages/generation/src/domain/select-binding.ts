import type { EngineBinding, RunInputs } from "@rosesfield/contract"
import { EngineBindingInvalidError } from "#domain/error/engine-binding-invalid.error"
import { isRecord } from "#domain/is-record"
import { refusalOf } from "#domain/refused-binding"
import { pickTask, taskAdapter } from "#domain/task-binding"

type SelectBy = "value" | "filled" | "count"

type SelectConfig = {
  input: string
  by?: SelectBy
  options: Record<string, EngineBinding>
}

export const selectAdapter = "select"

const maxDepth = 5

export function selectBinding(config: SelectConfig): EngineBinding {
  return { adapter: selectAdapter, config }
}

export function resolveBinding(
  binding: EngineBinding,
  inputs: RunInputs
): EngineBinding {
  let current = binding
  let chosen = inputs
  for (let depth = 0; isChoosing(current); depth += 1) {
    if (depth >= maxDepth) {
      throw invalid("a select holds selects too deep")
    }
    if (current.adapter === taskAdapter) {
      const picked = pickTask(current, chosen)
      current = picked.binding
      chosen = picked.inputs
    } else {
      current = pick(current.config, chosen)
    }
  }
  const refusal = refusalOf(current)
  if (refusal !== null) {
    throw refusal
  }
  return current
}

function isChoosing(binding: EngineBinding): boolean {
  return binding.adapter === selectAdapter || binding.adapter === taskAdapter
}

function pick(
  config: Record<string, unknown>,
  inputs: RunInputs
): EngineBinding {
  const { input, by, options } = config
  if (typeof input !== "string" || !isRecord(options)) {
    throw invalid("a select needs an input and its options")
  }
  const key = keyOf(by ?? "value", input, inputs[input])
  const chosen = Object.hasOwn(options, key) ? options[key] : undefined
  if (!isBinding(chosen)) {
    throw invalid(`no option is bound to ${key}`)
  }
  return chosen
}

function keyOf(by: unknown, input: string, value: unknown): string {
  switch (by) {
    case "value":
      if (typeof value !== "string") {
        throw invalid(`the input ${input} holds no choice`)
      }
      return value
    case "filled":
      return countOf(input, value) === 0 ? "empty" : "filled"
    case "count":
      return String(countOf(input, value))
    default:
      throw invalid("a select picks by value, filled or count")
  }
}

function countOf(input: string, value: unknown): number {
  if (value === undefined) {
    return 0
  }
  if (!Array.isArray(value)) {
    throw invalid(`the input ${input} holds no assets`)
  }
  return value.length
}

function isBinding(value: unknown): value is EngineBinding {
  return (
    isRecord(value) &&
    typeof value.adapter === "string" &&
    isRecord(value.config)
  )
}

function invalid(reason: string): EngineBindingInvalidError {
  return new EngineBindingInvalidError({ adapter: selectAdapter, reason })
}
