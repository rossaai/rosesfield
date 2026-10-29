import {
  assetId,
  assetKind,
  cost,
  heldOutput,
  mimeType,
  run as runSchema,
} from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import { z } from "zod"
import type { EngineStepJob, EngineSteps } from "#domain/generation-engine.port"
import { Run, type RunJob } from "#domain/run"
import type { runTable } from "#infrastructure/drizzle-run-table"

export type RunRow = typeof runTable.$inferSelect

const planRow = runSchema.shape.plan.unwrap()

const stepOutputRow = z.object({
  assetId,
  kind: assetKind,
  mime: mimeType,
  width: z.number().int().min(1).nullable(),
  height: z.number().int().min(1).nullable(),
  durationSeconds: z.number().positive().nullable(),
})

const stepsRow = z.object({
  plan: planRow,
  planCost: cost.optional(),
  jobs: z.array(
    z.object({
      number: z.number().int().min(1),
      engine: z.string().min(1),
      ref: z.string().min(1),
      cost: cost.optional(),
      made: stepOutputRow.optional(),
    })
  ),
})

type StepJobRow = z.infer<typeof stepsRow>["jobs"][number]

function stepJobOf(row: StepJobRow): EngineStepJob {
  const { cost, made, ...job } = row
  return {
    ...job,
    ...(cost === undefined ? {} : { cost }),
    ...(made === undefined
      ? {}
      : { made: { ...made, assetId: assetIdFormat.parse(made.assetId) } }),
  }
}

function stepsOf(row: z.infer<typeof stepsRow>): EngineSteps {
  const { planCost } = row
  return {
    plan: row.plan,
    ...(planCost === undefined ? {} : { planCost }),
    jobs: row.jobs.map(stepJobOf),
  }
}

const jobRow = z.object({
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
  held: z.array(heldOutput).optional(),
  dropped: z.number().int().min(1).optional(),
  cost: cost.optional(),
  collectingSince: z.iso.datetime().optional(),
  submittingSince: z.iso.datetime().optional(),
  steps: stepsRow.optional(),
})

function jobOf(row: z.infer<typeof jobRow>): RunJob {
  const {
    collectingSince,
    submittingSince,
    cost,
    dropped,
    steps,
    held,
    ...job
  } = row
  return {
    ...job,
    ...(held === undefined
      ? {}
      : {
          held: held.map((one) => ({
            ...one,
            assetId: assetIdFormat.parse(one.assetId),
          })),
        }),
    ...(cost === undefined ? {} : { cost }),
    ...(dropped === undefined ? {} : { dropped }),
    outputs: job.outputs.map((id) => assetIdFormat.parse(id)),
    ...(collectingSince === undefined ? {} : { collectingSince }),
    ...(submittingSince === undefined ? {} : { submittingSince }),
    ...(steps === undefined ? {} : { steps: stepsOf(steps) }),
  }
}

function jobsOf(value: unknown): RunJob[] {
  return z.array(jobRow).parse(value).map(jobOf)
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
    place: record.place ?? "library",
    attempts,
    version,
    createdAt: Date.parse(record.createdAt),
    finishedAt:
      record.finishedAt === null ? null : Date.parse(record.finishedAt),
  }
}

export function fromRunRow(row: RunRow): Run {
  const jobs = jobsOf(row.jobs)
  const dropped = jobs.reduce((sum, job) => sum + (job.dropped ?? 0), 0)
  const plan = jobs.find((job) => job.steps !== undefined)?.steps?.plan
  const held = jobs.flatMap((job) => job.held ?? [])
  const record = runSchema.parse({
    id: row.id,
    appId: row.appId,
    status: row.status,
    inputs: row.inputs,
    count: row.count,
    aspectRatio: row.aspectRatio,
    seed: row.seed,
    outputs: row.outputs,
    ...(held.length === 0 ? {} : { held }),
    ...(row.place === "held" ? { place: "held" } : {}),
    ...(dropped === 0 ? {} : { dropped }),
    ...(plan === undefined ? {} : { plan }),
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
    jobs,
    idempotencyKey: row.idempotencyKey,
    attempts: row.attempts,
    version: row.version,
  })
}
