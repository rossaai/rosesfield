import type { Run as RunRecord } from "@rosesfield/contract"
import { appIdFormat, runIdFormat } from "@rosesfield/kernel"
import { RunCursorInvalidError } from "#domain/error/run-cursor-invalid.error"
import type { Run } from "#domain/run"
import type { RunCursor, RunRepository } from "#domain/run.repository"

export type ListRunsInput = {
  appId: string | null
  cursor: string | null
}

export type ListRunsOutput = {
  runs: RunRecord[]
  next: string | null
}

type ListRunsHandlerOptions = {
  runs: RunRepository
}

export class ListRunsHandler {
  static readonly pageSize = 50
  static readonly cursorPattern: RegExp = /^(\d{1,15})-(.+)$/

  private readonly runs: RunRepository

  constructor(options: ListRunsHandlerOptions) {
    this.runs = options.runs
  }

  async execute(input: ListRunsInput): Promise<ListRunsOutput> {
    const found = await this.runs.list({
      appId: input.appId === null ? null : appIdFormat.parse(input.appId),
      before: input.cursor === null ? null : this.readCursor(input.cursor),
      limit: ListRunsHandler.pageSize + 1,
    })
    const page = found.slice(0, ListRunsHandler.pageSize)
    const last = page.at(-1)
    const hasMore = found.length > ListRunsHandler.pageSize
    return {
      runs: page.map((run) => run.toRecord()),
      next: hasMore && last !== undefined ? this.writeCursor(last) : null,
    }
  }

  private writeCursor(run: Run): string {
    return `${run.createdAt.getTime()}-${run.id}`
  }

  private readCursor(cursor: string): RunCursor {
    const match = ListRunsHandler.cursorPattern.exec(cursor)
    const time = match?.[1]
    const id = match?.[2]
    if (time === undefined || id === undefined || !runIdFormat.is(id)) {
      throw new RunCursorInvalidError({ cursor })
    }
    return { createdAt: new Date(Number(time)), id }
  }
}
