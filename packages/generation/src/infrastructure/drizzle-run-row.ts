import { assetId, run as runSchema } from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import { z } from "zod"
import { Run, type RunJob } from "#domain/run"
import type { runTable } from "#infrastructure/drizzle-run-table"

export type RunRow = typeof runTable.$inferSelect

const jobRows = z.array(
  z.object({
    index: z.number().int().min(0).max(15),
    seed: z.number().int().min(0).nullable(),
    ref: z.string().min(1).nullable(),
    status: z.enum([
      "pending",
      "submitting",
      "queued",
      "running",
      "collecting",
      "done",
    ]),
    progress: z.number().min(0).max(1).nullable(),
    outputs: z.array(assetId),
    collectingSince: z.iso.datetime().optional(),
    submittingSince: z.iso.datetime().optional(),
  })
)

function jobsOf(value: unknown): RunJob[] {
  return jobRows
    .parse(value)
    .map(({ collectingSince, submittingSince, ...job }) => ({
      ...job,
      outputs: job.outputs.map((id) => assetIdFormat.parse(id)),
      ...(collectingSince === undefined ? {} : { collectingSince }),
      ...(submittingSince === undefined ? {} : { submittingSince }),
    }))
}

export function toRunRow(run: Run): RunRow {
  const { record, jobs, idempotencyKey, attempts, version } = run.toState()
  return {
    id: record.id,
    appId: record.appId,
    status: record.status,
    inputs: record.inputs,
    count: record.count,
    aspectRatio: record.aspectRatio,
    seed: record.seed,
    outputs: record.outputs,
    progress: record.progress,
    engineAdapter: record.engine.adapter,
    engineModels: record.engine.models,
    workflowHash: record.engine.workflowHash,
    jobs,
    costAmount: record.cost === null ? null : record.cost.amount,
    origin: record.origin,
    failureCode: record.failure === null ? null : record.failure.code,
    failureStatus: record.failure === null ? null : record.failure.status,
    idempotencyKey,
    attempts,
    version,
    createdAt: Date.parse(record.createdAt),
    finishedAt:
      record.finishedAt === null ? null : Date.parse(record.finishedAt),
  }
}

export function fromRunRow(row: RunRow): Run {
  const record = runSchema.parse({
    id: row.id,
    appId: row.appId,
    status: row.status,
    inputs: row.inputs,
    count: row.count,
    aspectRatio: row.aspectRatio,
    seed: row.seed,
    outputs: row.outputs,
    progress: row.progress,
    engine: {
      adapter: row.engineAdapter,
      models: row.engineModels,
      workflowHash: row.workflowHash,
    },
    cost:
      row.costAmount === null
        ? null
        : { amount: row.costAmount, currency: "USD" },
    origin: row.origin,
    failure:
      row.failureCode === null || row.failureStatus === null
        ? null
        : { code: row.failureCode, status: row.failureStatus },
    createdAt: new Date(row.createdAt).toISOString(),
    finishedAt:
      row.finishedAt === null ? null : new Date(row.finishedAt).toISOString(),
  })
  return Run.restore({
    record,
    jobs: jobsOf(row.jobs),
    idempotencyKey: row.idempotencyKey,
    attempts: row.attempts,
    version: row.version,
  })
}
