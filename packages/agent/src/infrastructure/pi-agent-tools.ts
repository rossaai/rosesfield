import type { ToolRegistration } from "@earendil-works/pi-durable"
import type { AppDefinition } from "@rosesfield/contract"
import type { StartRunHandler } from "@rosesfield/generation"
import { appTool } from "#infrastructure/pi-app-tool"
import {
  type LibraryToolHandlers,
  libraryTools,
} from "#infrastructure/pi-library-tools"

export type AgentToolHandlers = LibraryToolHandlers & {
  startRun: StartRunHandler
}

type AgentToolsOptions = {
  apps: readonly AppDefinition[]
  handlers: () => AgentToolHandlers
}

export function agentTools(options: AgentToolsOptions): ToolRegistration[] {
  const { handlers } = options
  return [
    ...options.apps
      .filter((app) => app.closedKey === null)
      .map((app) => appTool(app, () => handlers().startRun)),
    ...libraryTools(handlers),
  ]
}
