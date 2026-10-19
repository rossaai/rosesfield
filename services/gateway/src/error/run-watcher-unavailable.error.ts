import { DependencyError } from "@rosesfield/kernel"

type RunWatcherUnavailableErrorOptions = {
  status: number
}

export class RunWatcherUnavailableError extends DependencyError {
  override readonly code = "RUN_WATCHER_UNAVAILABLE"

  constructor(options: RunWatcherUnavailableErrorOptions) {
    super({
      message: `The run watcher answered ${options.status} and watches no run`,
    })
  }
}
