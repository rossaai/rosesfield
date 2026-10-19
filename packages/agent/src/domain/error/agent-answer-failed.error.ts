import { DependencyError } from "@rosesfield/kernel"

type AgentAnswerFailedErrorOptions = {
  reason: string
}

export class AgentAnswerFailedError extends DependencyError {
  override readonly code = "AGENT_ANSWER_FAILED"

  constructor(options: AgentAnswerFailedErrorOptions) {
    super({ message: `The agent did not answer: ${options.reason}` })
  }
}
