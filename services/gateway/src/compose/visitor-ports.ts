import type { AgentHarness } from "@rosesfield/agent"
import type { AppDefinition } from "@rosesfield/contract"
import { DrizzlePriceBook } from "@rosesfield/generation"
import type { Clock } from "@rosesfield/kernel"
import type { AssetStore } from "@rosesfield/library"
import type { AgentRequest } from "#agent/agent-access"
import { buildHandlers } from "#build-handlers"
import type { RuntimeDefer } from "#catalog/shared-router-catalog"
import { type EngineOptions, visitorEngines } from "#compose/pick-engines"
import { visitorScope } from "#compose/request-scope"
import { visitorSettings } from "#compose/settings"
import type { WorkerVars } from "#env"
import type { GatewayContext } from "#gateway"
import type { ServedPlace } from "#gateway.contract"
import type { RequestScope } from "#gateway-env"
import { SqliteAssetRepository } from "#infrastructure/sqlite-asset-repository"
import { SqliteCharacterRepository } from "#infrastructure/sqlite-character-repository"
import type { SqliteDatabase } from "#infrastructure/sqlite-database"
import { SqliteRunRepository } from "#infrastructure/sqlite-run-repository"
import { PolledJobRunner } from "#session/polled-job-runner"
import { type SessionId, SessionScope } from "#session/session-scope"
import { readVisitorKeys } from "#session/visitor-keys"
import type { GuideFiles } from "#vfx/guide-files"

export type SessionAgentHost = {
  agentOf: (sessionId: SessionId) => AgentHarness
  hold: (sessionId: SessionId, request: AgentRequest) => () => void
}

export type VisitorDeps = {
  vars: WorkerVars
  place: ServedPlace
  apps: readonly AppDefinition[]
  db: SqliteDatabase
  store: AssetStore
  clock: Clock
  engineOptions: EngineOptions
  agents: SessionAgentHost | null
  defer?: RuntimeDefer
  guides?: GuideFiles
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
  const modelKey = deps.vars.agent === null ? null : keys.engine
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
      ...(deps.guides === undefined ? {} : { guides: deps.guides }),
    },
    () => new PolledJobRunner()
  )
  return visitorScope({
    sessionId,
    handlers,
    runs,
    engines,
    settings: visitorSettings(deps.vars, keys, deps.place),
    agent: agents === null ? null : agents.agentOf(sessionId),
    canAnswer: modelKey !== null,
    defer: deps.defer ?? (() => undefined),
    hold: () =>
      agents === null
        ? () => undefined
        : agents.hold(sessionId, { handlers, modelKey }),
  })
}
