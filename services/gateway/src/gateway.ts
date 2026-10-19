import type { AppDefinition } from "@rosesfield/contract"
import { type Context, Hono, type MiddlewareHandler } from "hono"
import { agentRoutes } from "#agent/agent-routes"
import type { GatewayApp, GatewayEnv, RequestScope } from "#gateway-env"
import { type OwnerLockOptions, ownerLock } from "#lock/owner-lock"
import { mcpPath, mcpRoute } from "#mcp/mcp-route"
import { assetRoutes } from "#routes/asset-routes"
import { characterRoutes } from "#routes/character-routes"
import { errorResponse, routeNotFound } from "#routes/error-response"
import { appRoutes, runRoutes } from "#routes/run-routes"
import { settingsRoutes } from "#routes/settings-routes"
import { type SessionGuardOptions, sessionGuard } from "#session/session-cookie"

export type GatewayContext = Context<GatewayEnv>

export type GatewayGuard =
  | ({ mode: "owner" } & OwnerLockOptions)
  | ({ mode: "public" } & SessionGuardOptions)

export type AgentMount =
  | { mode: "routes" }
  | { mode: "forward"; forward: (c: GatewayContext) => Promise<Response> }

export type GatewayOptions = {
  apps: readonly AppDefinition[]
  guard: GatewayGuard
  scopeFor: (c: GatewayContext) => Promise<RequestScope>
  agent: AgentMount
  platform: readonly MiddlewareHandler[]
}

function guardOf(guard: GatewayGuard): MiddlewareHandler<GatewayEnv> {
  if (guard.mode === "public") {
    return sessionGuard(guard)
  }
  const lock = ownerLock(guard)
  return async (c, next) => {
    c.set("session", null)
    return lock(c, next)
  }
}

export function scopeMiddleware(
  scopeFor: (c: GatewayContext) => Promise<RequestScope>
): MiddlewareHandler<GatewayEnv> {
  return async (c, next) => {
    const scope = await scopeFor(c)
    c.set("scope", scope)
    const release = scope.hold()
    try {
      await next()
    } finally {
      release()
    }
  }
}

export function createGateway(options: GatewayOptions): GatewayApp {
  const app = new Hono<GatewayEnv>()
  app.onError(errorResponse)
  app.notFound(routeNotFound)
  const guard = guardOf(options.guard)
  app.use("/api/*", guard)
  app.use(mcpPath, guard)
  if (options.agent.mode === "forward") {
    app.all("/api/agent/*", options.agent.forward)
  }
  const scope = scopeMiddleware(options.scopeFor)
  app.use("/api/*", scope)
  app.use(mcpPath, scope)
  appRoutes(app, options.apps)
  runRoutes(app)
  assetRoutes(app)
  characterRoutes(app)
  settingsRoutes(app)
  if (options.agent.mode === "routes") {
    agentRoutes(app)
  }
  mcpRoute(app, options.apps)
  app.all("/api/*", routeNotFound)
  for (const handler of options.platform) {
    app.get("*", handler)
  }
  return app
}
