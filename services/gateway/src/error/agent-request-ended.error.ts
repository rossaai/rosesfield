import { PreconditionFailedError } from "@rosesfield/kernel"

export class AgentRequestEndedError extends PreconditionFailedError {
  override readonly code = "AGENT_REQUEST_ENDED"

  constructor() {
    super({
      message:
        "The agent called a tool after the request that carried your keys ended",
    })
  }
}
