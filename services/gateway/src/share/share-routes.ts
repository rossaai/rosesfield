import { type ShareView, sharePaths, shareRoutes } from "@rosesfield/contract"
import type { Context } from "hono"
import type { GatewayApp } from "#gateway-env"
import type { ResponseOf } from "#routes/read-request"
import { readVisitorKeys } from "#session/visitor-keys"
import { createShare, type ShareParts } from "#share/create-share"
import type { ByteRange, ShareFiles } from "#share/share-files"
import { ShareKeyRequiredError } from "#share/share-key-required.error"
import { ShareNotFoundError } from "#share/share-not-found.error"
import { explorePage, type PageSource, sharePage } from "#share/share-page"
import type { ShareRecord } from "#share/sqlite-share-repository"

export type ShareMount = ShareParts & {
  page: PageSource | null
  files: ShareFiles
  limit: (c: Context) => Promise<void>
  needsKey: boolean
}

const publicHeaders = {
  "Cache-Control": "public, max-age=86400",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "X-Content-Type-Options": "nosniff",
  "Accept-Ranges": "bytes",
}

export function shareViewOf(record: ShareRecord): ShareView {
  return {
    id: record.id,
    path: `/share/${record.id}`,
    run: record.run,
    media: record.media.map((media, index) => ({
      index,
      kind: media.kind,
      mime: media.mime,
      width: media.width,
      height: media.height,
      durationSeconds: media.durationSeconds,
    })),
    createdAt: new Date(record.createdAt).toISOString(),
    expiresAt:
      record.expiresAt === null
        ? null
        : new Date(record.expiresAt).toISOString(),
  }
}

export function rangeOf(
  header: string | undefined,
  size: number
): ByteRange | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header ?? "")
  if (match === null) {
    return null
  }
  const [, from = "", to = ""] = match
  if (from === "" && to === "") {
    return null
  }
  if (from === "") {
    return { start: Math.max(0, size - Number(to)), end: size - 1 }
  }
  return {
    start: Number(from),
    end: to === "" ? size - 1 : Math.min(Number(to), size - 1),
  }
}

async function liveShare(mount: ShareMount, c: Context): Promise<ShareRecord> {
  const shareId = c.req.param("shareId") ?? ""
  const record = await mount.shares.get(shareId, mount.clock.now().getTime())
  if (record === null) {
    throw new ShareNotFoundError({ shareId })
  }
  return record
}

async function mediaResponse(
  c: Context,
  mount: ShareMount,
  key: string,
  mime: string
): Promise<Response> {
  const size = await mount.files.size(key)
  if (size === null) {
    throw new ShareNotFoundError({ shareId: key })
  }
  const headers = { ...publicHeaders, "Content-Type": mime }
  const range = rangeOf(c.req.header("range"), size)
  if (range !== null && (range.start > range.end || range.start >= size)) {
    return c.body(null, 416, { ...headers, "Content-Range": `bytes */${size}` })
  }
  const part = await mount.files.read(key, range)
  if (part === null) {
    throw new ShareNotFoundError({ shareId: key })
  }
  const length = String(part.range.end - part.range.start + 1)
  if (range === null) {
    return c.body(part.body, 200, { ...headers, "Content-Length": length })
  }
  return c.body(part.body, 206, {
    ...headers,
    "Content-Length": length,
    "Content-Range": `bytes ${part.range.start}-${part.range.end}/${size}`,
  })
}

export function shareApiRoute(app: GatewayApp, mount: ShareMount): void {
  const route = shareRoutes.shareRun
  app.post(route.path, async (c) => {
    if (mount.needsKey && readVisitorKeys(c).engine === null) {
      throw new ShareKeyRequiredError()
    }
    const record = await createShare(c.var.scope.handlers, mount, {
      runId: c.req.param("runId"),
      sessionId: c.var.session,
    })
    const body: ResponseOf<typeof route> = { share: shareViewOf(record) }
    return c.json(body, route.status)
  })
}

function publicDataRoutes(app: GatewayApp, mount: ShareMount): void {
  app.get(sharePaths.list, async (c) => {
    const listed = await mount.shares.listed(mount.clock.now().getTime())
    return c.json({ shares: listed.map(shareViewOf) }, 200)
  })
  app.get(sharePaths.data, async (c) => {
    const body: { share: ShareView } = {
      share: shareViewOf(await liveShare(mount, c)),
    }
    return c.json(body, 200)
  })
  app.get(sharePaths.media, async (c) => {
    const record = await liveShare(mount, c)
    const media = record.media[Number(c.req.param("index"))]
    if (media === undefined) {
      throw new ShareNotFoundError({ shareId: record.id })
    }
    return mediaResponse(c, mount, media.key, media.mime)
  })
}

function pageRoutes(
  app: GatewayApp,
  mount: ShareMount,
  page: PageSource
): void {
  app.get(sharePaths.page, async (c) => {
    const html = await page()
    if (html === null) {
      return c.notFound()
    }
    const record = await mount.shares.get(
      c.req.param("shareId") ?? "",
      mount.clock.now().getTime()
    )
    return c.html(
      record === null ? html : sharePage(html, shareViewOf(record), c.req.url)
    )
  })
  app.get("/", async (c) => {
    const html = await page()
    if (html === null) {
      return c.notFound()
    }
    const listed = await mount.shares.listed(mount.clock.now().getTime())
    return c.html(explorePage(html, listed.map(shareViewOf), c.req.url))
  })
}

export function sharePublicRoutes(app: GatewayApp, mount: ShareMount): void {
  app.use(`${sharePaths.list}/*`, async (c, next) => {
    await mount.limit(c)
    await next()
  })
  app.use(sharePaths.list, async (c, next) => {
    await mount.limit(c)
    await next()
  })
  publicDataRoutes(app, mount)
  if (mount.page !== null) {
    pageRoutes(app, mount, mount.page)
  }
}
