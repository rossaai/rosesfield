import type { Run as RunRecord } from "@rosesfield/contract"
import { runIdFormat } from "@rosesfield/kernel"
import { RunNotFoundError } from "#domain/error/run-not-found.error"
import type { RunRepository } from "#domain/run.repository"

export type GetRunInput = {
  runId: string
}

export type GetRunOutput = {
  run: RunRecord
}

type GetRunHandlerOptions = {
  runs: RunRepository
}

export class GetRunHandler {
  private readonly runs: RunRepository

  constructor(options: GetRunHandlerOptions) {
    this.runs = options.runs
  }

  async execute(input: GetRunInput): Promise<GetRunOutput> {
    const run = await this.runs.get(runIdFormat.parse(input.runId))
    if (run === null) {
      throw new RunNotFoundError({ runId: input.runId })
    }
    return { run: run.toRecord() }
  }
}
