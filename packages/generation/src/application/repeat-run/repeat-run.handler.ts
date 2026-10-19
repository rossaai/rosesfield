import type { Run as RunRecord } from "@rosesfield/contract"
import { runIdFormat } from "@rosesfield/kernel"
import type { StartRunHandler } from "#application/start-run/start-run.handler"
import { RunNotFoundError } from "#domain/error/run-not-found.error"
import type { RunRepository } from "#domain/run.repository"

export type RepeatRunInput = {
  runId: string
}

export type RepeatRunOutput = {
  run: RunRecord
}

type RepeatRunHandlerOptions = {
  runs: RunRepository
  start: StartRunHandler
}

export class RepeatRunHandler {
  private readonly runs: RunRepository
  private readonly start: StartRunHandler

  constructor(options: RepeatRunHandlerOptions) {
    this.runs = options.runs
    this.start = options.start
  }

  async execute(input: RepeatRunInput): Promise<RepeatRunOutput> {
    const run = await this.runs.get(runIdFormat.parse(input.runId))
    if (run === null) {
      throw new RunNotFoundError({ runId: input.runId })
    }
    const record = run.toRecord()
    return this.start.execute({
      appId: record.appId,
      body: {
        inputs: record.inputs,
        count: record.count,
        ...(record.aspectRatio === null
          ? {}
          : { aspectRatio: record.aspectRatio }),
      },
      idempotencyKey: null,
      seed: record.seed,
    })
  }
}
