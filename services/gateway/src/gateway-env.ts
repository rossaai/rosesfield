import type { Hono } from "hono"
import type { AgentRouteHandlers } from "#agent/agent-handlers"
import type { Handlers } from "#build-handlers"
import type { Settings } from "#gateway.contract"
import type { SignContent } from "#lock/content-links"
import type { SessionId } from "#session/session-scope"

export type RequestScope = {
  handlers: Handlers
  agent: AgentRouteHandlers
  settings: Settings
  keyFor: (key: string | null) => Promise<string | null>
  pollRun: (runId: string) => Promise<void>
  hold: () => () => void
}

export type GatewayVariables = {
  session: SessionId | null
  scope: RequestScope
  signContent: SignContent
}

export type GatewayEnv = { Variables: GatewayVariables }

export type GatewayApp = Hono<GatewayEnv>
