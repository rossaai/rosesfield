import type { AgentToolHandlers } from "@rosesfield/agent"
import { AgentRequestEndedError } from "#error/agent-request-ended.error"

export type AgentRequest = {
  handlers: AgentToolHandlers
  modelKey: string | null
}

export class AgentAccess {
  private current: AgentRequest | null = null
  private holds = 0

  enter(request: AgentRequest): () => void {
    this.current = request
    this.holds += 1
    let released = false
    return () => {
      if (released) {
        return
      }
      released = true
      this.holds -= 1
      if (this.holds === 0) {
        this.current = null
      }
    }
  }

  isHeld(): boolean {
    return this.holds > 0
  }

  handlers(): AgentToolHandlers {
    if (this.current === null) {
      throw new AgentRequestEndedError()
    }
    return this.current.handlers
  }

  modelKey(): string | null {
    return this.current?.modelKey ?? null
  }
}
