import { routes } from "@rosesfield/contract"
import { UploadAssetHandler } from "@rosesfield/library"
import type { GatewayApp } from "#gateway-env"
import { limitBody, type ResponseOf, readQuery } from "#routes/read-request"

const contentHeaders = {
  "Cache-Control": "private, max-age=31536000, immutable",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "X-Content-Type-Options": "nosniff",
}

export function assetRoutes(app: GatewayApp): void {
  app.get(routes.listAssets.path, async (c) => {
    const query = readQuery(c, routes.listAssets.query)
    const page = await c.var.scope.handlers.listAssets.execute({
      kind: query.kind ?? null,
      cursor: query.cursor ?? null,
    })
    return c.json(
      page satisfies ResponseOf<typeof routes.listAssets>,
      routes.listAssets.status
    )
  })
  app.post(
    routes.uploadAsset.path,
    limitBody(UploadAssetHandler.maxBytes),
    async (c) => {
      const uploaded = await c.var.scope.handlers.uploadAsset.execute({
        bytes: new Uint8Array(await c.req.arrayBuffer()),
        mime: c.req.header("content-type") ?? "",
        sourceRunId: null,
        width: null,
        height: null,
        durationSeconds: null,
      })
      return c.json(
        uploaded satisfies ResponseOf<typeof routes.uploadAsset>,
        routes.uploadAsset.status
      )
    }
  )
  app.get(routes.getAsset.path, async (c) => {
    const found = await c.var.scope.handlers.getAsset.execute({
      assetId: c.req.param("assetId"),
    })
    return c.json(
      found satisfies ResponseOf<typeof routes.getAsset>,
      routes.getAsset.status
    )
  })
  app.get(routes.readAssetContent.path, async (c) => {
    const { asset, bytes } =
      await c.var.scope.handlers.readAssetContent.execute({
        assetId: c.req.param("assetId"),
      })
    return c.body(new Uint8Array(bytes), routes.readAssetContent.status, {
      ...contentHeaders,
      "Content-Type": asset.mime,
    })
  })
  app.delete(routes.deleteAsset.path, async (c) => {
    await c.var.scope.handlers.deleteAsset.execute({
      assetId: c.req.param("assetId"),
    })
    return c.body(null, routes.deleteAsset.status)
  })
}
