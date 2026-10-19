import { z } from "zod"
import type { AppDefinition, AppOutput } from "#app.contract"
import { assetId, characterId } from "#id.contract"
import { type InputDefinition, runInputs } from "#input.contract"
import { isRuledInput } from "#input-rule.contract"
import { checkRuledInputs } from "#ruled-inputs.contract"
import { type RunRequest, runCount, runRequest } from "#run.contract"
import { aspectRatio, seed, toggleValue } from "#value.contract"

type Presence = "required" | "optional"

export const startRunBody = z.strictObject({
  inputs: runInputs,
  count: runCount.optional(),
  aspectRatio: aspectRatio.nullable().optional(),
})

export type StartRunBody = z.infer<typeof startRunBody>

function promptValue(input: { presence: Presence; maxLength: number }) {
  const text = z.string().max(input.maxLength)
  return input.presence === "required" ? text.regex(/\S/) : text.optional()
}

function referenceValue(
  id: typeof assetId | typeof characterId,
  input: { presence: Presence; max: number }
) {
  const list = z.array(id).max(input.max)
  return input.presence === "required" ? list.min(1) : list.default([])
}

function numberValue(input: {
  min: number
  max: number
  step: number
  default: number
}) {
  return z.number().min(input.min).max(input.max).multipleOf(input.step)
}

function idOf(input: InputDefinition): typeof assetId | typeof characterId {
  return input.type === "character" ? characterId : assetId
}

function valueFor(input: InputDefinition): z.ZodType {
  switch (input.type) {
    case "prompt":
      return promptValue(input)
    case "image":
    case "video":
    case "audio":
    case "character":
      return referenceValue(idOf(input), input)
    case "choice":
      return z
        .enum(input.options.map((option) => option.value))
        .default(input.default)
    case "number":
      return numberValue(input).default(input.default)
    case "toggle":
      return toggleValue.default(input.default)
    case "seed":
      return seed.optional()
  }
}

function ruledValueFor(input: InputDefinition): z.ZodType {
  switch (input.type) {
    case "prompt":
      return z.string().max(input.maxLength).optional()
    case "image":
    case "video":
    case "audio":
    case "character":
      return z.array(idOf(input)).max(input.max).optional()
    case "choice":
      return z.enum(input.options.map((option) => option.value)).optional()
    case "number":
      return numberValue(input).optional()
    case "toggle":
      return toggleValue.optional()
    case "seed":
      return seed.optional()
  }
}

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

function countFixingInput(app: {
  inputs: readonly InputDefinition[]
}): ChoiceInput | null {
  const found = app.inputs.find(
    (input): input is ChoiceInput =>
      input.type === "choice" &&
      input.options.some((option) => option.count !== undefined)
  )
  return found ?? null
}

export function fixedCountOf(
  app: { inputs: readonly InputDefinition[] },
  inputs: Readonly<Record<string, unknown>>
): number | null {
  const input = countFixingInput(app)
  if (input === null) {
    return null
  }
  const chosen = inputs[input.name] ?? input.default
  const option = input.options.find((one) => one.value === chosen)
  return option?.count ?? null
}

function aspectRatioFor(output: AppOutput) {
  if (output.kind === "image" || output.kind === "video") {
    return {
      aspectRatio: z
        .enum(output.aspectRatios.options)
        .default(output.aspectRatios.default),
    }
  }
  return {}
}

function bodyOf(app: AppDefinition, count: z.ZodType) {
  const inputs = z.strictObject(
    Object.fromEntries(
      app.inputs.map((input) => [
        input.name,
        isRuledInput(input) ? ruledValueFor(input) : valueFor(input),
      ])
    )
  )
  return z.strictObject({ inputs, count, ...aspectRatioFor(app.output) })
}

export function startRunBodyFor(app: AppDefinition): z.ZodType<RunRequest> {
  const isFixing = countFixingInput(app) !== null
  const isRuled = app.inputs.some(isRuledInput)
  const max = app.output.count.max
  if (!isFixing && !isRuled) {
    return bodyOf(
      app,
      runCount.max(max).default(app.output.count.default)
    ).pipe(runRequest)
  }
  const count = isFixing
    ? runCount.max(max).optional()
    : runCount.max(max).default(app.output.count.default)
  return bodyOf(app, count)
    .transform((body, context) => {
      const inputs = checkRuledInputs(app, body.inputs, context)
      if (inputs === null) {
        return z.NEVER
      }
      if (!isFixing) {
        return { ...body, inputs }
      }
      const fixed = fixedCountOf(app, inputs) ?? app.output.count.default
      if (body.count !== undefined && body.count !== fixed) {
        context.addIssue({
          code: "custom",
          message: `These inputs make ${fixed}, so the count must be ${fixed}`,
          path: ["count"],
        })
        return z.NEVER
      }
      return { ...body, inputs, count: fixed }
    })
    .pipe(runRequest)
}
