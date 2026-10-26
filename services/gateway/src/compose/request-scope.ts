import type { AgentHarness } from "@rosesfield/agent"
import {
  type GenerationEngine,
  RunConflictError,
  type RunRepository,
  StartRunHandler,
} from "@rosesfield/generation"
import { runIdFormat } from "@rosesfield/kernel"
import { agentRouteHandlers } from "#agent/agent-handlers"
import type { Handlers } from "#build-handlers"
import type { RuntimeDefer } from "#catalog/shared-router-catalog"
import type { Settings } from "#gateway.contract"
import type { RequestScope } from "#gateway-env"
import { pollOnce } from "#session/run-polls"
import type { SessionId } from "#session/session-scope"

type OwnerScopeOptions = {
  handlers: Handlers
  agent: AgentHarness | null
  settings: Settings
  hold?: () => () => void
}

export function ownerScope(options: OwnerScopeOptions): RequestScope {
  const { handlers, agent } = options
  const pollRun = async (): Promise<void> => undefined
  return {
    handlers,
    agent: agentRouteHandlers({
      agent,
      canAnswer: true,
      startRun: handlers.startRun,
      getRun: handlers.getRun,
      pollRun,
    }),
    settings: options.settings,
    keyFor: async (key) => key,
    pollRun,
    hold: options.hold ?? (() => () => undefined),
  }
}

type VisitorScopeOptions = {
  sessionId: SessionId
  handlers: Handlers
  runs: RunRepository
  engines: readonly GenerationEngine[]
  settings: Settings
  agent: AgentHarness | null
  canAnswer: boolean
  hold: () => () => void
  defer: RuntimeDefer
}

async function sessionKey(
  sessionId: SessionId,
  key: string | null
): Promise<string | null> {
  if (key === null || !StartRunHandler.keyPattern.test(key)) {
    return key
  }
  const bytes = new TextEncoder().encode(`${sessionId}\n${key}`)
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))
  return `s-${[...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`
}

async function pollRun(
  options: VisitorScopeOptions,
  runId: string
): Promise<void> {
  if (!runIdFormat.is(runId)) {
    return
  }
  const run = await options.runs.get(runId)
  const engine = options.engines.find((one) => one.key === run?.adapter)
  if (run === null || run.isFinished() || engine === undefined) {
    return
  }
  try {
    const { nextWakeMs } = await options.handlers.advanceRun.execute({ runId })
    if (nextWakeMs === null) {
      options.defer(options.handlers.advanceRun.priced(runId))
    }
  } catch (error) {
    if (!(error instanceof RunConflictError)) {
      throw error
    }
  }
}

export function visitorScope(options: VisitorScopeOptions): RequestScope {
  const { handlers, sessionId } = options
  const poll = (runId: string): Promise<void> =>
    pollOnce(runId, () => pollRun(options, runId))
  return {
    handlers,
    agent: agentRouteHandlers({
      agent: options.agent,
      canAnswer: options.canAnswer,
      startRun: handlers.startRun,
      getRun: handlers.getRun,
      pollRun: poll,
    }),
    settings: options.settings,
    keyFor: (key) => sessionKey(sessionId, key),
    pollRun: poll,
    hold: options.hold,
  }
}
