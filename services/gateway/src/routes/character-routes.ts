import { routes } from "@rosesfield/contract"
import type { GatewayApp } from "#gateway-env"
import {
  jsonBodyMaxBytes,
  limitBody,
  parseWith,
  type ResponseOf,
  readJson,
} from "#routes/read-request"

export function characterRoutes(app: GatewayApp): void {
  app.get(routes.listCharacters.path, async (c) => {
    const listed = await c.var.scope.handlers.listCharacters.execute()
    return c.json(
      listed satisfies ResponseOf<typeof routes.listCharacters>,
      routes.listCharacters.status
    )
  })
  app.post(
    routes.createCharacter.path,
    limitBody(jsonBodyMaxBytes),
    async (c) => {
      const body = routes.createCharacter.body
      const created = await c.var.scope.handlers.createCharacter.execute(
        parseWith(body, await readJson(c), "body")
      )
      return c.json(
        created satisfies ResponseOf<typeof routes.createCharacter>,
        routes.createCharacter.status
      )
    }
  )
  app.get(routes.getCharacter.path, async (c) => {
    const found = await c.var.scope.handlers.getCharacter.execute({
      characterId: c.req.param("characterId"),
    })
    return c.json(
      found satisfies ResponseOf<typeof routes.getCharacter>,
      routes.getCharacter.status
    )
  })
  app.patch(
    routes.updateCharacter.path,
    limitBody(jsonBodyMaxBytes),
    async (c) => {
      const body = routes.updateCharacter.body
      const updated = await c.var.scope.handlers.updateCharacter.execute({
        characterId: c.req.param("characterId"),
        changes: parseWith(body, await readJson(c), "body"),
      })
      return c.json(
        updated satisfies ResponseOf<typeof routes.updateCharacter>,
        routes.updateCharacter.status
      )
    }
  )
  app.delete(routes.deleteCharacter.path, async (c) => {
    await c.var.scope.handlers.deleteCharacter.execute({
      characterId: c.req.param("characterId"),
    })
    return c.body(null, routes.deleteCharacter.status)
  })
}
