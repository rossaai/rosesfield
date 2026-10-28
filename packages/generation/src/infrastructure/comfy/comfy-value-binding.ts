import { inputName } from "@rosesfield/contract"
import { z } from "zod"
import { EngineBindingInvalidError } from "#domain/error/engine-binding-invalid.error"
import type { EngineRequest } from "#domain/generation-engine.port"
import { isRecord } from "#domain/is-record"

type PathSegment = string | number

const path = z
  .array(z.union([z.string().min(1).max(200), z.number().int().min(0)]))
  .min(1)
  .max(8)

const valueMap = z.record(z.string(), z.json())

const rateMap = z.record(z.string(), z.number().positive())

export const comfyValueBinding = z.discriminatedUnion("from", [
  z.strictObject({
    from: z.literal("input"),
    name: inputName,
    path,
    map: valueMap.optional(),
    index: z.number().int().min(0).max(15).optional(),
  }),
  z.strictObject({
    from: z.literal("inputLength"),
    name: inputName,
    path,
    rate: z.strictObject({ input: inputName, map: rateMap }),
    plus: z.number().min(0),
    max: z.number().positive(),
  }),
  z.strictObject({ from: z.literal("seed"), path }),
  z.strictObject({ from: z.literal("count"), path, map: valueMap.optional() }),
  z.strictObject({
    from: z.literal("aspectRatio"),
    path,
    map: valueMap.optional(),
  }),
])

export type ComfyValueBinding = z.infer<typeof comfyValueBinding>

type BindingContext = {
  adapter: string
  request: EngineRequest
  assetValue: (assetId: string) => unknown
  createMissing: boolean
}

export function applyBindings(
  document: Record<string, unknown>,
  bindings: readonly ComfyValueBinding[],
  context: BindingContext
): Record<string, unknown> {
  const filled = structuredClone(document)
  for (const binding of bindings) {
    const value = boundValue(binding, context)
    if (value !== undefined) {
      setAt(filled, binding.path, value, context)
    }
  }
  return filled
}

function boundValue(
  binding: ComfyValueBinding,
  context: BindingContext
): unknown {
  const { request } = context
  switch (binding.from) {
    case "seed":
      return request.seed ?? undefined
    case "count":
      return mapped(binding, request.count, context)
    case "aspectRatio":
      return request.aspectRatio === null
        ? undefined
        : mapped(binding, request.aspectRatio, context)
    case "input":
      return inputValue(binding, context)
    case "inputLength":
      return lengthValue(binding, context)
  }
}

function lengthValue(
  binding: Extract<ComfyValueBinding, { from: "inputLength" }>,
  context: BindingContext
): number | undefined {
  const { inputs } = context.request
  const text = inputs[binding.name]
  const picked = inputs[binding.rate.input]
  if (typeof text !== "string" || typeof picked !== "string") {
    return undefined
  }
  const rate = mapped(
    { path: binding.path, map: binding.rate.map },
    picked,
    context
  )
  if (typeof rate !== "number") {
    return undefined
  }
  const value = binding.plus + [...text].length * rate
  return Math.min(binding.max, Math.ceil(value * 100) / 100)
}

function inputValue(
  binding: Extract<ComfyValueBinding, { from: "input" }>,
  context: BindingContext
): unknown {
  const value = context.request.inputs[binding.name]
  if (value === undefined) {
    return undefined
  }
  if (!Array.isArray(value)) {
    return mapped(binding, value, context)
  }
  if (binding.index === undefined) {
    return value.length === 0 ? undefined : value.map(context.assetValue)
  }
  const id = value[binding.index]
  return id === undefined ? undefined : context.assetValue(id)
}

function mapped(
  binding: { path: PathSegment[]; map?: Record<string, unknown> | undefined },
  value: string | number,
  context: BindingContext
): unknown {
  if (binding.map === undefined) {
    return value
  }
  const key = String(value)
  if (!Object.hasOwn(binding.map, key)) {
    throw invalid(context, `the map at ${binding.path.join(".")} has no ${key}`)
  }
  return binding.map[key]
}

function setAt(
  container: unknown,
  path: readonly PathSegment[],
  value: unknown,
  context: BindingContext
): void {
  const [segment, ...rest] = path
  if (segment === undefined) {
    return
  }
  const where = path.join(".")
  if (isRecord(container) && typeof segment === "string") {
    if (rest.length === 0) {
      container[segment] = value
      return
    }
    container[segment] = childOf(container[segment], rest, context, where)
    setAt(container[segment], rest, value, context)
    return
  }
  if (Array.isArray(container) && typeof segment === "number") {
    if (rest.length === 0) {
      container[segment] = value
      return
    }
    container[segment] = childOf(container[segment], rest, context, where)
    setAt(container[segment], rest, value, context)
    return
  }
  throw invalid(context, `the path ${where} does not fit the document`)
}

function childOf(
  child: unknown,
  rest: readonly PathSegment[],
  context: BindingContext,
  where: string
): unknown {
  if (child !== undefined) {
    return child
  }
  if (!context.createMissing) {
    throw invalid(context, `nothing exists at ${where}`)
  }
  return typeof rest[0] === "number" ? [] : {}
}

function invalid(
  context: BindingContext,
  reason: string
): EngineBindingInvalidError {
  return new EngineBindingInvalidError({ adapter: context.adapter, reason })
}
