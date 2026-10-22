import type { RawEvent } from "@comfyorg/sdk/low"
import { z } from "zod"
import { EngineUnavailableError } from "#domain/error/engine-unavailable.error"
import type { EngineStatus } from "#domain/generation-engine.port"

type EventReading = EngineStatus | "ended" | null

export const outputSchema = z.object({
  id: z.string().min(1),
  node_id: z.string(),
  name: z.string().default(""),
  type: z.string(),
  content_type: z.string(),
})

const jobSchema = z.object({
  id: z.string().min(1),
  status: z.enum([
    "queued",
    "running",
    "succeeded",
    "canceling",
    "canceled",
    "failed",
    "expired",
  ]),
  progress: z.object({ value: z.number().min(0).max(1) }).nullish(),
  metrics: z.object({ execution_ms: z.number().min(0).nullish() }).nullish(),
  outputs: z.array(outputSchema).default([]),
  error: z
    .object({
      code: z.string(),
      message: z.string().nullish(),
      node_id: z.string().nullish(),
      class_type: z.string().nullish(),
      node_errors: z.record(z.string(), z.unknown()).optional(),
    })
    .nullish(),
})

export type Job = z.infer<typeof jobSchema>

export type JobOutput = z.infer<typeof outputSchema>

const statusEvent = z.object({ status: jobSchema.shape.status })

const progressEvent = z.object({ value: z.number().min(0).max(1) })

export function parseJob(value: unknown): Job {
  const result = jobSchema.safeParse(value)
  if (!result.success) {
    throw new EngineUnavailableError({ cause: result.error })
  }
  return result.data
}

export function readingOf(
  event: RawEvent,
  progress: number | null
): EventReading {
  if (event.event === "error") {
    return "ended"
  }
  if (event.event === "progress") {
    const progress = progressEvent.safeParse(event.data)
    return progress.success
      ? {
          state: "running",
          progress: progress.data.value,
          retryAfterSeconds: null,
        }
      : null
  }
  if (event.event !== "status") {
    return null
  }
  const status = statusEvent.safeParse(event.data)
  if (!status.success) {
    return null
  }
  switch (status.data.status) {
    case "queued":
      return { state: "queued", progress: null, retryAfterSeconds: null }
    case "running":
    case "canceling":
      return { state: "running", progress, retryAfterSeconds: null }
    default:
      return "ended"
  }
}
