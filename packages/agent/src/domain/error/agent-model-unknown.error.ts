import { PreconditionFailedError } from "@rosesfield/kernel"

type AgentModelUnknownErrorOptions = {
  provider: string
  model: string
}

export class AgentModelUnknownError extends PreconditionFailedError {
  override readonly code = "AGENT_MODEL_UNKNOWN"

  constructor(options: AgentModelUnknownErrorOptions) {
    super({
      message: `The provider ${options.provider} lists no model ${options.model} for the agent`,
    })
  }
}
