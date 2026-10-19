import { PreconditionFailedError } from "@rosesfield/kernel"

export class AgentModelMissingError extends PreconditionFailedError {
  override readonly code = "AGENT_MODEL_MISSING"

  constructor() {
    super({ message: "The agent has no model to answer with" })
  }
}
