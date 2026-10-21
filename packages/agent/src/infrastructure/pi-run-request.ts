import {
  type ModelForm,
  publishedInputOf,
  publishedModelOf,
} from "@rosesfield/catalog/comfy"
import {
  storyboardAppId,
  storyboardBodyFor,
} from "@rosesfield/catalog/storyboard"
import {
  type AppDefinition,
  type RunRequest,
  runRequest,
} from "@rosesfield/contract"
import { RunInputInvalidError } from "@rosesfield/generation"
import type { z } from "zod"

export function isKeyframeChain(app: AppDefinition): boolean {
  return app.id === storyboardAppId
}

export function appInputOf(
  app: AppDefinition,
  forms: readonly ModelForm[]
): z.ZodType<unknown> {
  return isKeyframeChain(app)
    ? storyboardBodyFor(app)
    : publishedInputOf(app, forms)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function requestOf(app: AppDefinition, parsed: unknown): RunRequest {
  const body = isRecord(parsed) ? parsed : {}
  const given = isRecord(body.inputs) ? body.inputs : {}
  const inputs = Object.fromEntries(
    Object.entries(given).filter(
      ([, value]) => value !== "" && value !== undefined
    )
  )
  const model = publishedModelOf(app)
  return runRequest.parse({
    inputs: model === null || "model" in inputs ? inputs : { ...inputs, model },
    count:
      typeof body.count === "number" ? body.count : app.output.count.default,
    aspectRatio: typeof body.aspectRatio === "string" ? body.aspectRatio : null,
  })
}

export function parseRequest(
  app: AppDefinition,
  schema: z.ZodType<unknown>,
  args: unknown
): RunRequest {
  const result = schema.safeParse(args)
  if (result.success) {
    return requestOf(app, result.data)
  }
  const issues = result.error.issues.map(
    (issue) => `${issue.path.join(".") || "body"}: ${issue.message}`
  )
  throw new RunInputInvalidError({ appId: app.id, issues })
}
