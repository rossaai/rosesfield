import { PreconditionFailedError } from "@rosesfield/kernel"

type WorkflowInvalidErrorOptions = {
  folder: string
  reason: string
}

export class WorkflowInvalidError extends PreconditionFailedError {
  override readonly code = "WORKFLOW_INVALID"

  constructor(options: WorkflowInvalidErrorOptions) {
    super({
      message: `The workflow in workflows/${options.folder} is invalid: ${options.reason}`,
    })
  }
}
