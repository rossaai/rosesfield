import type { RunId } from "@rosesfield/kernel"
import { JobRunner } from "#domain/job-runner.port"

export class FakeJobRunner extends JobRunner {
  readonly enqueued: RunId[] = []

  override async enqueue(runId: RunId): Promise<void> {
    this.enqueued.push(runId)
  }
}
