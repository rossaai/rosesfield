import type { AppId, RunId } from "@rosesfield/kernel"
import type { Run } from "#domain/run"

export type RunCursor = {
  createdAt: Date
  id: RunId
}

export type RunPage = {
  appId: AppId | null
  before: RunCursor | null
  limit: number
}

export abstract class RunRepository {
  /** Stores a new run and returns it at its stored version. */
  abstract add(run: Run): Promise<Run>

  /** Stores a changed run when nothing changed it since it was read. */
  abstract save(run: Run): Promise<Run>

  /** Returns the run with this id, or null. */
  abstract get(id: RunId): Promise<Run | null>

  /** Returns the run started with this idempotency key, or null. */
  abstract findByIdempotencyKey(key: string): Promise<Run | null>

  /** Lists the runs a person started newest first, before the cursor when one is given. A run held for a run chain is never listed. */
  abstract list(page: RunPage): Promise<Run[]>

  /** Lists every run that has not finished, oldest first. */
  abstract listUnfinished(): Promise<Run[]>
}
