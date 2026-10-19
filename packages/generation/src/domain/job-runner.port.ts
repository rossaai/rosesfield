import type { RunId } from "@rosesfield/kernel"

export abstract class JobRunner {
  /** Watches a run and wakes it until it ends. */
  abstract enqueue(runId: RunId): Promise<void>
}
