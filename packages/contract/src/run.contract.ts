import { z } from "zod"
import { errorBody } from "#error.contract"
import { appId, assetId, runId } from "#id.contract"
import { runInputs } from "#input.contract"
import { adapterKey, aspectRatio, seed, timestamp } from "#value.contract"

export const runStatus = z.enum([
  "queued",
  "running",
  "done",
  "failed",
  "cancelled",
])

export const runOrigin = z.enum(["live", "demo"])

export const runCount = z.number().int().min(1).max(16)

export const cost = z.object({
  amount: z.number().min(0),
  currency: z.literal("USD"),
})

export const runEngine = z.object({
  adapter: adapterKey,
  models: z.array(z.string().min(1).max(200)).max(16),
  workflowHash: z.string().min(1).max(128).nullable(),
})

export const runRequest = z.object({
  inputs: runInputs,
  count: runCount,
  aspectRatio: aspectRatio.nullable().default(null),
})

export const run = z.object({
  id: runId,
  appId,
  status: runStatus,
  inputs: runInputs,
  count: runCount,
  aspectRatio: aspectRatio.nullable(),
  seed: seed.nullable(),
  outputs: z.array(assetId),
  dropped: z.number().int().min(1).max(1000).optional(),
  progress: z.number().min(0).max(1).nullable(),
  engine: runEngine,
  cost: cost.nullable(),
  origin: runOrigin,
  failure: errorBody.nullable(),
  createdAt: timestamp,
  finishedAt: timestamp.nullable(),
})

export type RunStatus = z.infer<typeof runStatus>
export type RunOrigin = z.infer<typeof runOrigin>
export type Cost = z.infer<typeof cost>
export type RunEngine = z.infer<typeof runEngine>
export type RunRequest = z.infer<typeof runRequest>
export type Run = z.infer<typeof run>
