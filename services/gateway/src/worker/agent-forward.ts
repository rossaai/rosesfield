import type { GatewayContext } from "#gateway"
import { AgentHost } from "#worker/agent-host"

export function forwardToAgentHost(
  agents: DurableObjectNamespace
): (c: GatewayContext) => Promise<Response> {
  return (c) => {
    const session = c.var.session
    const headers = new Headers(c.req.raw.headers)
    headers.delete(AgentHost.sessionHeader)
    if (session !== null) {
      headers.set(AgentHost.sessionHeader, session)
    }
    const host = agents.getByName(session ?? AgentHost.ownerName)
    return host.fetch(new Request(c.req.raw, { headers }))
  }
}
