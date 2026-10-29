import { PreconditionFailedError } from "@rosesfield/kernel"

type RunNeedsYesErrorOptions = {
  appId: string
}

export class RunNeedsYesError extends PreconditionFailedError {
  override readonly code = "RUN_NEEDS_YES"

  constructor(options: RunNeedsYesErrorOptions) {
    super({
      message: `A ${options.appId} run above 480p waits for the person's yes. Start the 480p draft, show it to the person, and let them start the final from Rosesfield.`,
    })
  }
}
