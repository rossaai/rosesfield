import { JobRunner } from "@rosesfield/generation"
import type { RunId } from "@rosesfield/kernel"

export class FakeJobRunner extends JobRunner {
  readonly enqueued: RunId[] = []

  override async enqueue(runId: RunId): Promise<void> {
    this.enqueued.push(runId)
  }
}
