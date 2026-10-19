import {
  type AppDefinition,
  type EngineBinding,
  type RunInputs,
  type Run as RunRecord,
  type RunRequest,
  startRunBodyFor,
} from "@rosesfield/contract"
import { type Clock, runIdFormat } from "@rosesfield/kernel"
import type { AppCatalog } from "#domain/app-catalog.port"
import { AppNotFoundError } from "#domain/error/app-not-found.error"
import { EngineBindingInvalidError } from "#domain/error/engine-binding-invalid.error"
import { IdempotencyKeyInvalidError } from "#domain/error/idempotency-key-invalid.error"
import { IdempotencyKeyReusedError } from "#domain/error/idempotency-key-reused.error"
import { RunInputInvalidError } from "#domain/error/run-input-invalid.error"
import type { GenerationEngine } from "#domain/generation-engine.port"
import type { JobRunner } from "#domain/job-runner.port"
import { Run } from "#domain/run"
import type { RunRepository } from "#domain/run.repository"
import { resolveBinding } from "#domain/select-binding"

export type StartRunInput = {
  appId: string
  body: unknown
  idempotencyKey: string | null
  seed: number | null
}

export type StartRunOutput = {
  run: RunRecord
}

type Picked = {
  engine: GenerationEngine
  binding: EngineBinding
}

type StartRunHandlerOptions = {
  apps: AppCatalog
  runs: RunRepository
  engines: readonly GenerationEngine[]
  jobs: JobRunner
  clock: Clock
}

export class StartRunHandler {
  static readonly maxSeed = Run.maxSeed
  static readonly keyPattern: RegExp = /^[\x21-\x7e]{1,255}$/

  private readonly apps: AppCatalog
  private readonly runs: RunRepository
  private readonly engines: readonly GenerationEngine[]
  private readonly jobs: JobRunner
  private readonly clock: Clock

  constructor(options: StartRunHandlerOptions) {
    this.apps = options.apps
    this.runs = options.runs
    this.engines = options.engines
    this.jobs = options.jobs
    this.clock = options.clock
  }

  async execute(input: StartRunInput): Promise<StartRunOutput> {
    const app = this.apps.find(input.appId)
    if (app === null) {
      throw new AppNotFoundError({ appId: input.appId })
    }
    const existing = await this.findExisting(app, input.idempotencyKey)
    if (existing !== null) {
      return { run: existing.toRecord() }
    }
    const request = this.parseRequest(app, input.body)
    const { engine, binding } = this.pickEngine(app, request)
    const run = Run.queue({
      id: runIdFormat.parse(crypto.randomUUID()),
      appId: app.id,
      request,
      seed: this.seedFor(app, request.inputs, input.seed),
      adapter: engine.key,
      origin: engine.origin,
      idempotencyKey: input.idempotencyKey,
      now: this.clock.now(),
      outputsPerJob: engine.outputsPerJob(binding),
    })
    const stored = await this.runs.add(run)
    await this.jobs.enqueue(stored.id)
    return { run: stored.toRecord() }
  }

  private async findExisting(
    app: AppDefinition,
    key: string | null
  ): Promise<Run | null> {
    if (key === null) {
      return null
    }
    if (!StartRunHandler.keyPattern.test(key)) {
      throw new IdempotencyKeyInvalidError()
    }
    const existing = await this.runs.findByIdempotencyKey(key)
    if (existing !== null && existing.appId !== app.id) {
      throw new IdempotencyKeyReusedError({ appId: app.id })
    }
    return existing
  }

  private parseRequest(app: AppDefinition, body: unknown): RunRequest {
    const result = startRunBodyFor(app).safeParse(body)
    if (result.success) {
      return result.data
    }
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join(".") || "body"}: ${issue.message}`
    )
    throw new RunInputInvalidError({ appId: app.id, issues })
  }

  private pickEngine(app: AppDefinition, request: RunRequest): Picked {
    const binding = resolveBinding(app.engine, request.inputs)
    const engine = this.engines.find((candidate) => candidate.canRun(binding))
    if (engine === undefined) {
      throw new EngineBindingInvalidError({
        adapter: binding.adapter,
        reason: "no engine on this server runs it",
      })
    }
    return { engine, binding }
  }

  private seedFor(
    app: AppDefinition,
    inputs: RunInputs,
    given: number | null
  ): number | null {
    const seedInput = app.inputs.find((input) => input.type === "seed")
    if (seedInput === undefined) {
      return null
    }
    const chosen = inputs[seedInput.name]
    if (typeof chosen === "number") {
      return chosen
    }
    if (given !== null) {
      return given
    }
    const random = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0
    return random % (StartRunHandler.maxSeed + 1)
  }
}
