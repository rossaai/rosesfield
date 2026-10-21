import {
  type AppDefinition,
  type EngineBinding,
  inputRulesOf,
  isRuledInput,
  type RunInputs,
  type Run as RunRecord,
  type RunRequest,
  startRunBodyFor,
} from "@rosesfield/contract"
import { assetIdFormat, type Clock, runIdFormat } from "@rosesfield/kernel"
import type { AppCatalog } from "#domain/app-catalog.port"
import { AppClosedError } from "#domain/error/app-closed.error"
import { AppNotFoundError } from "#domain/error/app-not-found.error"
import { EngineBindingInvalidError } from "#domain/error/engine-binding-invalid.error"
import { IdempotencyKeyInvalidError } from "#domain/error/idempotency-key-invalid.error"
import { IdempotencyKeyReusedError } from "#domain/error/idempotency-key-reused.error"
import { ModelNotFoundError } from "#domain/error/model-not-found.error"
import { ModelNotOfferedError } from "#domain/error/model-not-offered.error"
import { RunInputInvalidError } from "#domain/error/run-input-invalid.error"
import { isOneAtATime } from "#domain/field-role"
import type {
  GenerationEngine,
  OutputsPerJob,
} from "#domain/generation-engine.port"
import { acceptedInputsOf, imageProblemsOf } from "#domain/image-accept"
import { isRecord } from "#domain/is-record"
import type { JobRunner } from "#domain/job-runner.port"
import { checkModelInputs, type ModelForm } from "#domain/model-form"
import type { ModelPolicy } from "#domain/model-policy.port"
import { Run } from "#domain/run"
import type { RunRepository } from "#domain/run.repository"
import type { RunAssets } from "#domain/run-assets.port"
import { resolveBinding } from "#domain/select-binding"
import {
  chosenModelOf,
  hostedModelBinding,
  hostedModelOf,
  isHostedModelId,
  taskAdapter,
  tasksOf,
} from "#domain/task-binding"

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

type Prepared = Picked & {
  request: RunRequest
  outputsPerJob?: OutputsPerJob
}

type Described = {
  engine: GenerationEngine
  form: ModelForm
}

type StartRunHandlerOptions = {
  apps: AppCatalog
  runs: RunRepository
  engines: readonly GenerationEngine[]
  jobs: JobRunner
  clock: Clock
  policy?: ModelPolicy
  assets?: RunAssets
}

export class StartRunHandler {
  static readonly maxSeed = Run.maxSeed
  static readonly keyPattern: RegExp = /^[\x21-\x7e]{1,255}$/
  static readonly hostedSeedInput = "seed"

  private readonly apps: AppCatalog
  private readonly runs: RunRepository
  private readonly engines: readonly GenerationEngine[]
  private readonly jobs: JobRunner
  private readonly clock: Clock
  private readonly policy: ModelPolicy | null
  private readonly assets: RunAssets | null

  constructor(options: StartRunHandlerOptions) {
    this.apps = options.apps
    this.runs = options.runs
    this.engines = options.engines
    this.jobs = options.jobs
    this.clock = options.clock
    this.policy = options.policy ?? null
    this.assets = options.assets ?? null
  }

  async execute(input: StartRunInput): Promise<StartRunOutput> {
    const app = this.apps.find(input.appId)
    if (app === null) {
      throw new AppNotFoundError({ appId: input.appId })
    }
    if (app.closedKey !== null) {
      throw new AppClosedError({ appId: app.id })
    }
    const existing = await this.findExisting(app, input.idempotencyKey)
    if (existing !== null) {
      return { run: existing.toRecord() }
    }
    const prepared = await this.prepare(app, input)
    const { engine, binding, request } = prepared
    await this.checkImages(app, request.inputs)
    const run = Run.queue({
      id: runIdFormat.parse(crypto.randomUUID()),
      appId: app.id,
      request,
      seed: this.seedFor(app, binding, request.inputs, input.seed),
      adapter: engine.key,
      origin: engine.origin,
      idempotencyKey: input.idempotencyKey,
      now: this.clock.now(),
      outputsPerJob: prepared.outputsPerJob ?? engine.outputsPerJob(binding),
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

  private async prepare(
    app: AppDefinition,
    input: StartRunInput
  ): Promise<Prepared> {
    const hosted = await this.prepareHosted(app, input.body)
    if (hosted !== null) {
      return hosted
    }
    const request = this.parseRequest(app, input.body)
    return { ...this.pickEngine(app, request), request }
  }

  private async prepareHosted(
    app: AppDefinition,
    body: unknown
  ): Promise<Prepared | null> {
    if (app.engine.adapter !== taskAdapter || !isRecord(body)) {
      return null
    }
    const given = isRecord(body.inputs) ? body.inputs : {}
    const model = chosenModelOf(
      app.engine,
      textInputsOf(ruledInputsOf(app, given))
    )
    if (model === null || !isHostedModelId(model)) {
      return null
    }
    const binding = hostedModelBinding(model)
    const engine = this.engines.find((candidate) => candidate.canRun(binding))
    const described = await this.describe(binding, engine)
    if (engine?.origin === "demo" && described === null) {
      return null
    }
    if (engine === undefined || described === null) {
      throw new ModelNotFoundError({ model })
    }
    await this.checkOffered(app, described.engine, model)
    const checked = checkModelInputs(described.form, given)
    const issues = checked.kind === "invalid" ? [...checked.issues] : []
    const count = countOf(app, described.form, body.count, issues)
    if (body.aspectRatio !== undefined && body.aspectRatio !== null) {
      issues.push(
        "aspectRatio: a hosted model sets its own aspect in its inputs"
      )
    }
    if (checked.kind === "invalid" || issues.length > 0) {
      throw new RunInputInvalidError({ appId: app.id, issues })
    }
    return {
      engine,
      binding,
      request: { inputs: checked.inputs, count, aspectRatio: null },
      outputsPerJob: count > 1 ? "one" : "all",
    }
  }

  private async describe(
    binding: EngineBinding,
    runner: GenerationEngine | undefined
  ): Promise<Described | null> {
    const own = runner === undefined ? null : await runner.formOf(binding)
    if (runner !== undefined && own !== null) {
      return { engine: runner, form: own }
    }
    for (const engine of this.engines.filter((one) => one !== runner)) {
      const form = await engine.formOf(binding).catch(() => null)
      if (form !== null) {
        return { engine, form }
      }
    }
    return null
  }

  private async checkOffered(
    app: AppDefinition,
    engine: GenerationEngine,
    model: string
  ): Promise<void> {
    const listed = (await engine.listModels()).find((one) => one.id === model)
    const tasks = tasksOf(app.engine)
    if (
      listed === undefined ||
      this.policy === null ||
      !this.policy.allows(tasks, listed, app.output.kind)
    ) {
      throw new ModelNotOfferedError({ appId: app.id, model })
    }
  }

  private async checkImages(
    app: AppDefinition,
    inputs: RunInputs
  ): Promise<void> {
    if (acceptedInputsOf(app).length === 0) {
      return
    }
    const assets = this.assets
    const problems =
      assets === null
        ? ["the server reads no input file, so it cannot check one"]
        : await imageProblemsOf(app, inputs, async (assetId) => {
            const file = await assets.read(assetIdFormat.parse(assetId))
            return { mime: file.mime, bytes: file.bytes }
          })
    if (problems.length > 0) {
      throw new RunInputInvalidError({ appId: app.id, issues: problems })
    }
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
    binding: EngineBinding,
    inputs: RunInputs,
    given: number | null
  ): number | null {
    if (hostedModelOf(binding) !== null) {
      const chosen = inputs[StartRunHandler.hostedSeedInput]
      return typeof chosen === "number" &&
        Number.isInteger(chosen) &&
        chosen >= 0 &&
        chosen <= StartRunHandler.maxSeed
        ? chosen
        : null
    }
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

function countOf(
  app: AppDefinition,
  form: ModelForm,
  given: unknown,
  issues: string[]
): number {
  if (given === undefined || given === 1) {
    return 1
  }
  const max = app.output.count.max
  if (!isOneAtATime(form.fields, app.output.kind)) {
    issues.push("count: this model sets its own count in its inputs")
    return 1
  }
  if (
    typeof given !== "number" ||
    !Number.isInteger(given) ||
    given < 1 ||
    given > max
  ) {
    issues.push(`count: a whole number from 1 to ${max}`)
    return 1
  }
  return given
}

function ruledInputsOf(
  app: AppDefinition,
  given: Record<string, unknown>
): Record<string, unknown> {
  const filled: Record<string, unknown> = { ...given }
  for (const rule of inputRulesOf(app, given)) {
    if (
      isRuledInput(rule.input) &&
      filled[rule.input.name] === undefined &&
      rule.fallback !== null
    ) {
      filled[rule.input.name] = rule.fallback
    }
  }
  return filled
}

function textInputsOf(given: Record<string, unknown>): RunInputs {
  return Object.fromEntries(
    Object.entries(given).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  )
}
