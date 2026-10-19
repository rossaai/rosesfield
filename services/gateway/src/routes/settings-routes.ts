import { engineTarget, engineTargets } from "#engine/engine-target"
import { gatewayRoutes } from "#gateway.contract"
import type { GatewayApp } from "#gateway-env"
import type { ResponseOf } from "#routes/read-request"

const healthy: ResponseOf<typeof gatewayRoutes.getHealth> = { status: "ok" }

const targetList = engineTarget.options.map((target) => ({
  target,
  settings: [...engineTargets[target]],
}))

export function settingsRoutes(app: GatewayApp): void {
  const routes = gatewayRoutes
  app.get(routes.getSettings.path, (c) => {
    const body: ResponseOf<typeof routes.getSettings> = {
      settings: c.var.scope.settings,
    }
    return c.json(body, routes.getSettings.status)
  })
  app.get(routes.getEngineSettings.path, (c) => {
    const body: ResponseOf<typeof routes.getEngineSettings> = {
      engine: c.var.scope.settings.engine,
      targets: targetList,
    }
    return c.json(body, routes.getEngineSettings.status)
  })
  app.post(routes.checkEngineKey.path, async (c) => {
    const { settings, handlers } = c.var.scope
    const { checks } = await handlers.checkEngineKey.execute({})
    const body: ResponseOf<typeof routes.checkEngineKey> = {
      checks: checks.map((one) => ({
        ...one,
        target: one.origin === "demo" ? "demo" : settings.engine.target,
      })),
    }
    return c.json(body, routes.checkEngineKey.status)
  })
  app.get(routes.getHealth.path, (c) =>
    c.json(healthy, routes.getHealth.status)
  )
}
