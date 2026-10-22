import { PreconditionFailedError } from "@rosesfield/kernel"

type AgentTurnLimitErrorOptions = {
  limit: number
}

export class AgentTurnLimitError extends PreconditionFailedError {
  override readonly code = "AGENT_TURN_LIMIT"

  constructor(options: AgentTurnLimitErrorOptions) {
    super({
      message: `The agent stopped after ${options.limit} model calls in one turn`,
    })
  }
}
