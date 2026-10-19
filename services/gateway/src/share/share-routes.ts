import { assetIdFormat } from "@rosesfield/kernel"
import type { Context } from "hono"
import type { GatewayApp } from "#gateway-env"
import { limitBody, type ResponseOf } from "#routes/read-request"
import {
  createShare,
  type ShareParts,
  type SharePoster,
} from "#share/create-share"
import { type ShareView, sharePaths, shareRoutes } from "#share/share.contract"
import { ShareNotFoundError } from "#share/share-not-found.error"
import { explorePage, type PageSource, sharePage } from "#share/share-page"
import type { ShareRecord } from "#share/sqlite-share-repository"

export type ShareMount = ShareParts & {
  page: PageSource | null
}

const posterMaxBytes = 4_194_304
const posterTypes: readonly string[] = ["image/jpeg", "image/png", "image/webp"]

const publicHeaders = {
  "Cache-Control": "public, max-age=86400",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "X-Content-Type-Options": "nosniff",
  "Accept-Ranges": "bytes",
}

export function shareViewOf(record: ShareRecord): ShareView {
  const path = `/share/${record.id}`
  return {
    id: record.id,
    path,
    run: record.run,
    media: record.media.map((media, index) => ({
      index,
      kind: media.kind,
      mime: media.mime,
      width: media.width,
      height: media.height,
      durationSeconds: media.durationSeconds,
    })),
    poster: record.posterKey === null ? null : `${path}/poster`,
    createdAt: new Date(record.createdAt).toISOString(),
    expiresAt:
      record.expiresAt === null
        ? null
        : new Date(record.expiresAt).toISOString(),
  }
}

async function posterOf(c: Context): Promise<SharePoster | null> {
  const mime = (c.req.header("content-type") ?? "").split(";")[0]?.trim() ?? ""
  const bytes = new Uint8Array(await c.req.arrayBuffer())
  return bytes.length > 0 && posterTypes.includes(mime) ? { bytes, mime } : null
}

function rangeOf(
  header: string | undefined,
  size: number
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header ?? "")
  if (match === null) {
    return null
  }
  const [, from = "", to = ""] = match
  if (from === "" && to === "") {
    return null
  }
  const start = from === "" ? Math.max(0, size - Number(to)) : Number(from)
  const end =
    from === "" || to === "" ? size - 1 : Math.min(Number(to), size - 1)
  return { start, end }
}

function bytesResponse(c: Context, bytes: Uint8Array, mime: string): Response {
  const range = rangeOf(c.req.header("range"), bytes.length)
  const headers = { ...publicHeaders, "Content-Type": mime }
  if (range === null) {
    return c.body(new Uint8Array(bytes), 200, headers)
  }
  if (range.start > range.end || range.start >= bytes.length) {
    return c.body(null, 416, {
      ...headers,
      "Content-Range": `bytes */${bytes.length}`,
    })
  }
  return c.body(bytes.slice(range.start, range.end + 1), 206, {
    ...headers,
    "Content-Range": `bytes ${range.start}-${range.end}/${bytes.length}`,
  })
}

async function liveShare(mount: ShareMount, c: Context): Promise<ShareRecord> {
  const shareId = c.req.param("shareId") ?? ""
  const record = await mount.shares.get(shareId, mount.clock.now().getTime())
  if (record === null) {
    throw new ShareNotFoundError({ shareId })
  }
  return record
}

async function storedBytes(
  mount: ShareMount,
  key: string
): Promise<Uint8Array> {
  const bytes = await mount.store.get(assetIdFormat.parse(key))
  if (bytes === null) {
    throw new ShareNotFoundError({ shareId: key })
  }
  return bytes
}

export function shareApiRoute(app: GatewayApp, mount: ShareMount): void {
  const route = shareRoutes.shareRun
  app.post(route.path, limitBody(posterMaxBytes), async (c) => {
    const record = await createShare(c.var.scope.handlers, mount, {
      runId: c.req.param("runId"),
      sessionId: c.var.session,
      poster: await posterOf(c),
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
    return c.json({ share: shareViewOf(await liveShare(mount, c)) }, 200)
  })
  app.get(sharePaths.media, async (c) => {
    const record = await liveShare(mount, c)
    const media = record.media[Number(c.req.param("index"))]
    if (media === undefined) {
      throw new ShareNotFoundError({ shareId: record.id })
    }
    return bytesResponse(c, await storedBytes(mount, media.key), media.mime)
  })
  app.get(sharePaths.poster, async (c) => {
    const record = await liveShare(mount, c)
    if (record.posterKey === null || record.posterMime === null) {
      throw new ShareNotFoundError({ shareId: record.id })
    }
    return bytesResponse(
      c,
      await storedBytes(mount, record.posterKey),
      record.posterMime
    )
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
  publicDataRoutes(app, mount)
  if (mount.page !== null) {
    pageRoutes(app, mount, mount.page)
  }
}
