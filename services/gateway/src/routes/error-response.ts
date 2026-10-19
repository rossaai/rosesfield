import { type ErrorEnvelope, errorEnvelopeOf } from "@rosesfield/contract"
import { ProjectError, RateLimitedError } from "@rosesfield/kernel"
import type { Context } from "hono"
import { HTTPException } from "hono/http-exception"

const serverFailure: ErrorEnvelope = {
  error: { code: "SERVER_ERROR", status: 500 },
}

const routeMissing: ErrorEnvelope = {
  error: { code: "ROUTE_NOT_FOUND", status: 404 },
}

export function errorResponse(error: Error, c: Context): Response {
  if (error instanceof ProjectError) {
    if (error instanceof RateLimitedError && error.retryAfterSeconds !== null) {
      c.header("Retry-After", String(error.retryAfterSeconds))
    }
    return c.json(errorEnvelopeOf(error), error.status)
  }
  if (error instanceof HTTPException) {
    return error.getResponse()
  }
  console.error(error)
  return c.json(serverFailure, 500)
}

export function routeNotFound(c: Context): Response {
  return c.json(routeMissing, 404)
}
