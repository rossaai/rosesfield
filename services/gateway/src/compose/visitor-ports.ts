import type { AgentHarness } from "@rosesfield/agent"
import type { AppDefinition } from "@rosesfield/contract"
import { DrizzlePriceBook } from "@rosesfield/generation"
import type { Clock } from "@rosesfield/kernel"
import type { AssetStore } from "@rosesfield/library"
import type { AgentRequest } from "#agent/agent-access"
import { buildHandlers } from "#build-handlers"
import { type EngineOptions, visitorEngines } from "#compose/pick-engines"
import { visitorScope } from "#compose/request-scope"
import { visitorSettings } from "#compose/settings"
import type { WorkerVars } from "#env"
import type { GatewayContext } from "#gateway"
import type { RequestScope } from "#gateway-env"
import { SqliteAssetRepository } from "#infrastructure/sqlite-asset-repository"
import { SqliteCharacterRepository } from "#infrastructure/sqlite-character-repository"
import type { SqliteDatabase } from "#infrastructure/sqlite-database"
import { SqliteRunRepository } from "#infrastructure/sqlite-run-repository"
import { PolledJobRunner } from "#session/polled-job-runner"
import { type SessionId, SessionScope } from "#session/session-scope"
import { readVisitorKeys } from "#session/visitor-keys"

export type SessionAgentHost = {
  agentOf: (sessionId: SessionId) => AgentHarness
  hold: (sessionId: SessionId, request: AgentRequest) => () => void
}

export type VisitorDeps = {
  vars: WorkerVars
  apps: readonly AppDefinition[]
  db: SqliteDatabase
  store: AssetStore
  clock: Clock
  engineOptions: EngineOptions
  agents: SessionAgentHost | null
}

export async function visitorScopeFor(
  c: GatewayContext,
  deps: VisitorDeps
): Promise<RequestScope> {
  const sessionId = c.var.session
  if (sessionId === null) {
    throw new TypeError("A visitor request needs its session")
  }
  const keys = readVisitorKeys(c)
  const { db, agents } = deps
  const scope = new SessionScope({ db, sessionId })
  const runs = new SqliteRunRepository({ db, scope })
  const engines = visitorEngines(
    deps.vars.engine,
    keys.engine,
    deps.engineOptions
  )
  const { handlers } = buildHandlers(
    {
      apps: deps.apps,
      runs,
      assets: new SqliteAssetRepository({ db, scope }),
      characters: new SqliteCharacterRepository({ db, scope }),
      store: deps.store,
      engines,
      clock: deps.clock,
      prices: new DrizzlePriceBook({ db }),
    },
    () => new PolledJobRunner()
  )
  return visitorScope({
    sessionId,
    handlers,
    runs,
    engines,
    settings: visitorSettings(deps.vars, keys),
    agent: agents === null ? null : agents.agentOf(sessionId),
    canAnswer: keys.agent !== null,
    hold: () =>
      agents === null
        ? () => undefined
        : agents.hold(sessionId, { handlers, modelKey: keys.agent }),
  })
}
