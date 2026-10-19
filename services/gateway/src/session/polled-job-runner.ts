import { JobRunner } from "@rosesfield/generation"
import type { RunId } from "@rosesfield/kernel"

export class PolledJobRunner extends JobRunner {
  override async enqueue(_runId: RunId): Promise<void> {
    return
  }
}
