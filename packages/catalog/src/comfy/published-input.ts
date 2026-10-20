import {
  type AppDefinition,
  assetId,
  runCount,
  startRunBodyFor,
} from "@rosesfield/contract"
import {
  isOneAtATime,
  type HostedModel,
  isHostedModelId,
  type ModelField,
  type ModelForm,
} from "@rosesfield/generation/bindings"
import { z } from "zod"
import { defaultModelOf } from "#comfy/list-models"

const modelInput = "model"

function fieldSchemaOf(field: ModelField): z.ZodType {
  switch (field.kind) {
    case "prompt":
    case "text":
      return field.maxLength === null
        ? z.string()
        : z.string().max(field.maxLength)
    case "choice":
      return z.literal([...field.options])
    case "number": {
      const base = field.integer ? z.number().int() : z.number()
      const low = field.min === null ? base : base.min(field.min)
      return field.max === null ? low : low.max(field.max)
    }
    case "toggle":
      return z.enum(["on", "off"])
    case "media":
      return z
        .array(assetId)
        .min(field.required ? field.min : 0)
        .max(field.max)
  }
}

function inputsOf(form: ModelForm): z.ZodType {
  const shape: Record<string, z.ZodType> = {
    [modelInput]: z.literal(form.model).optional(),
  }
  for (const field of form.fields) {
    const value = fieldSchemaOf(field)
    shape[field.name] = field.required ? value : value.optional()
  }
  return z.strictObject(shape)
}

function formBody(app: AppDefinition, form: ModelForm): z.ZodType {
  const output = app.output.kind
  const count = runCount.max(app.output.count.max).optional()
  return z.strictObject({
    inputs: inputsOf(form),
    ...(isOneAtATime(form.fields, output) && app.output.count.max > 1
      ? { count }
      : {}),
  })
}

/** Gives the body an app publishes to MCP and to the agent: its default model's form when it declares a task, its own inputs otherwise. */
export function publishedInputOf(
  app: AppDefinition,
  models: readonly HostedModel[]
): z.ZodType<unknown> {
  const chosen = defaultModelOf(app)
  const form =
    chosen === null || !isHostedModelId(chosen)
      ? null
      : (models.find((model) => model.id === chosen)?.form ?? null)
  return form === null ? startRunBodyFor(app) : formBody(app, form)
}
