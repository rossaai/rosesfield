import { routes } from "@rosesfield/contract"
import {
  AssetPreviewInvalidError,
  PutAssetPreviewHandler,
  type ReadAssetContentOutput,
  UploadAssetHandler,
} from "@rosesfield/library"
import type { Context } from "hono"
import type { GatewayApp } from "#gateway-env"
import { limitBody, type ResponseOf, readQuery } from "#routes/read-request"
import { rangeOf } from "#share/share-routes"

const contentHeaders = {
  "Cache-Control": "private, max-age=31536000, immutable",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "X-Content-Type-Options": "nosniff",
  "Accept-Ranges": "bytes",
}

const previewHeaders = {
  "Cache-Control": "private, no-cache",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "X-Content-Type-Options": "nosniff",
}

const sentPreviewTypes: readonly string[] = ["image/webp", "image/jpeg"]

function contentResponse(
  c: Context,
  { asset, bytes, range }: ReadAssetContentOutput
): Response {
  const headers = { ...contentHeaders, "Content-Type": asset.mime }
  if (range === "unsatisfiable") {
    return c.body(null, 416, {
      ...headers,
      "Content-Range": `bytes */${asset.bytes}`,
    })
  }
  if (range === null) {
    return c.body(
      new Uint8Array(bytes),
      routes.readAssetContent.status,
      headers
    )
  }
  return c.body(new Uint8Array(bytes), 206, {
    ...headers,
    "Content-Range": `bytes ${range.start}-${range.end}/${asset.bytes}`,
  })
}

function previewTypeOf(c: Context): string {
  const mime =
    c.req.header("content-type")?.split(";")[0]?.trim().toLowerCase() ?? ""
  if (!sentPreviewTypes.includes(mime)) {
    throw new AssetPreviewInvalidError({
      reason: "a preview is sent as image/webp or image/jpeg",
    })
  }
  return mime
}

function previewRoutes(app: GatewayApp): void {
  app.get(routes.readAssetPreview.path, async (c) => {
    const read = await c.var.scope.handlers.readAssetPreview.execute({
      assetId: c.req.param("assetId"),
    })
    const bytes = new Uint8Array(read.bytes)
    return c.body(bytes, routes.readAssetPreview.status, {
      ...previewHeaders,
      "Content-Type": read.mime,
    })
  })
  app.put(
    routes.putAssetPreview.path,
    limitBody(PutAssetPreviewHandler.maxBytes),
    async (c) => {
      const mime = previewTypeOf(c)
      await c.var.scope.handlers.putAssetPreview.execute({
        assetId: c.req.param("assetId"),
        bytes: new Uint8Array(await c.req.arrayBuffer()),
        mime,
      })
      return c.body(null, routes.putAssetPreview.status)
    }
  )
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
    const header = c.req.header("range")
    const read = await c.var.scope.handlers.readAssetContent.execute({
      assetId: c.req.param("assetId"),
      ...(header === undefined
        ? {}
        : { rangeOf: (size: number) => rangeOf(header, size) }),
    })
    return contentResponse(c, read)
  })
  app.get(routes.linkAssetContent.path, async (c) => {
    const { url } = await c.var.scope.handlers.linkAsset.execute({
      assetId: c.req.param("assetId"),
    })
    const link = await c.var.signContent(url)
    return c.json(
      link satisfies ResponseOf<typeof routes.linkAssetContent>,
      routes.linkAssetContent.status
    )
  })
  previewRoutes(app)
  app.delete(routes.deleteAsset.path, async (c) => {
    await c.var.scope.handlers.deleteAsset.execute({
      assetId: c.req.param("assetId"),
    })
    return c.body(null, routes.deleteAsset.status)
  })
}
