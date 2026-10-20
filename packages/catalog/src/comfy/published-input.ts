import {
  type AppDefinition,
  assetId,
  runCount,
  startRunBodyFor,
} from "@rosesfield/contract"
import {
  checkModelInputs,
  isHostedModelId,
  isOneAtATime,
  type ModelField,
  type ModelForm,
} from "@rosesfield/generation/bindings"
import { z } from "zod"
import { defaultModelOf } from "#comfy/list-models"

const modelInput = "model"

function choicesOf(options: readonly (string | number)[]): (string | number)[] {
  const values = options.flatMap((option) => {
    const text = String(option)
    const number = Number(text)
    return Number.isFinite(number) && String(number) === text
      ? [option, text, number]
      : [option, text]
  })
  return [...new Set(values)]
}

function fieldSchemaOf(field: ModelField): z.ZodType {
  const value = valueSchemaOf(field)
  return field.required ? value : z.union([value, z.literal("")]).optional()
}

function valueSchemaOf(field: ModelField): z.ZodType {
  switch (field.kind) {
    case "prompt":
    case "text":
      return field.maxLength === null
        ? z.string()
        : z.string().max(field.maxLength)
    case "choice":
      return z.literal(choicesOf(field.options))
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
    shape[field.name] = fieldSchemaOf(field)
  }
  return z.strictObject(shape).superRefine((given, context) => {
    const checked = checkModelInputs(form, given)
    if (checked.kind === "invalid") {
      for (const issue of checked.issues) {
        context.addIssue({ code: "custom", message: issue })
      }
    }
  })
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

/** Names the hosted model whose form an app publishes, or null when it publishes its own inputs. */
export function publishedModelOf(app: AppDefinition): string | null {
  const chosen = defaultModelOf(app)
  return chosen !== null && isHostedModelId(chosen) ? chosen : null
}

/** Gives the body an app publishes to MCP and to the agent: its default model's form when it declares a task, its own inputs otherwise. */
export function publishedInputOf(
  app: AppDefinition,
  forms: readonly ModelForm[]
): z.ZodType<unknown> {
  const chosen = publishedModelOf(app)
  const form =
    chosen === null ? null : (forms.find((one) => one.model === chosen) ?? null)
  return form === null ? startRunBodyFor(app) : formBody(app, form)
}
