import { JobRunner } from "@rosesfield/generation"
import type { RunId } from "@rosesfield/kernel"
import { RunWatcherUnavailableError } from "#error/run-watcher-unavailable.error"
import { RunWatcher } from "#worker/run-watcher"

type AlarmJobRunnerOptions = {
  watchers: DurableObjectNamespace
}

export class AlarmJobRunner extends JobRunner {
  private readonly watchers: DurableObjectNamespace

  constructor(options: AlarmJobRunnerOptions) {
    super()
    this.watchers = options.watchers
  }

  override async enqueue(runId: RunId): Promise<void> {
    const response = await this.watchers
      .getByName(runId)
      .fetch(RunWatcher.watchUrl, { method: "POST", body: runId })
    if (!response.ok) {
      throw new RunWatcherUnavailableError({ status: response.status })
    }
  }
}
