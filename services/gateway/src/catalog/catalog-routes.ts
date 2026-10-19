import {
  catalogRoutes,
  defaultModelOf,
  modelsForApp,
  priceBody,
} from "@rosesfield/catalog/comfy"
import { type AppDefinition, errorEnvelopeOf } from "@rosesfield/contract"
import { AppNotFoundError } from "@rosesfield/generation"
import type { GatewayApp } from "#gateway-env"
import {
  jsonBodyMaxBytes,
  limitBody,
  parseWith,
  type ResponseOf,
  readJson,
} from "#routes/read-request"

function appOf(apps: readonly AppDefinition[], appId: string): AppDefinition {
  const found = apps.find((one) => one.id === appId)
  if (found === undefined) {
    throw new AppNotFoundError({ appId })
  }
  return found
}

export function modelRoutes(
  app: GatewayApp,
  apps: readonly AppDefinition[]
): void {
  app.get(catalogRoutes.listModels.path, async (c) => {
    const listed = appOf(apps, c.req.param("appId"))
    const { models, refusal } = await c.var.scope.handlers.listModels.execute(
      {}
    )
    const body: ResponseOf<typeof catalogRoutes.listModels> = {
      models: modelsForApp(listed, models),
      defaultModel: defaultModelOf(listed),
      refusal: refusal === null ? null : errorEnvelopeOf(refusal).error,
    }
    return c.json(body, catalogRoutes.listModels.status)
  })
  app.post(
    catalogRoutes.priceRun.path,
    limitBody(jsonBodyMaxBytes),
    async (c) => {
      const appId = appOf(apps, c.req.param("appId")).id
      const { inputs, count, aspectRatio } = parseWith(
        priceBody,
        await readJson(c),
        "body"
      )
      const { price } = await c.var.scope.handlers.priceRun.execute({
        appId,
        inputs,
        count,
        aspectRatio,
      })
      const body: ResponseOf<typeof catalogRoutes.priceRun> = { price }
      return c.json(body, catalogRoutes.priceRun.status)
    }
  )
}
