import type { RoutePayload } from "@rosesfield/contract"
import type { Context, MiddlewareHandler } from "hono"
import { bodyLimit } from "hono/body-limit"
import type { z } from "zod"
import { BodyTooLargeError } from "#error/body-too-large.error"
import { RequestInvalidError } from "#error/request-invalid.error"

type Answer = {
  response: RoutePayload
  status: number
}

export type ResponseOf<Route extends Answer> =
  Route["response"] extends z.ZodType ? z.input<Route["response"]> : never

const jsonType = /^application\/json[ \t]*(;|$)/i

export const jsonBodyMaxBytes = 1_048_576

export function limitBody(maxBytes: number): MiddlewareHandler {
  return bodyLimit({
    maxSize: maxBytes,
    onError: () => {
      throw new BodyTooLargeError({ maxBytes })
    },
  })
}

export async function readJson(c: Context): Promise<unknown> {
  if (!jsonType.test(c.req.header("content-type") ?? "")) {
    throw new RequestInvalidError({
      reason: "the body needs the type application/json",
    })
  }
  try {
    return await c.req.json()
  } catch {
    throw new RequestInvalidError({ reason: "the body is not valid JSON" })
  }
}

export async function readOptionalJson(c: Context): Promise<unknown> {
  const text = await c.req.text()
  if (text.trim() === "") {
    return null
  }
  if (!jsonType.test(c.req.header("content-type") ?? "")) {
    throw new RequestInvalidError({
      reason: "the body needs the type application/json",
    })
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new RequestInvalidError({ reason: "the body is not valid JSON" })
  }
}

export function parseWith<Shape>(
  schema: z.ZodType<Shape>,
  value: unknown,
  part: string
): Shape {
  const result = schema.safeParse(value)
  if (result.success) {
    return result.data
  }
  const issues = result.error.issues.map(
    (issue) => `${[part, ...issue.path].join(".")}: ${issue.message}`
  )
  throw new RequestInvalidError({ reason: issues.join(". ") })
}

export function readQuery<Shape>(c: Context, schema: z.ZodType<Shape>): Shape {
  return parseWith(schema, c.req.query(), "query")
}
