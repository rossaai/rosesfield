import { mkdtempSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { migrateRunTable } from "@rosesfield/generation"
import { assetIdFormat, FixedClock } from "@rosesfield/kernel"
import { FilesystemAssetStore, migrateLibraryTables } from "@rosesfield/library"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { Hono } from "hono"
import { afterEach, describe, expect, it } from "vitest"
import type { GatewayEnv } from "#gateway-env"
import { errorResponse } from "#routes/error-response"
import { migrateSessionTables } from "#session/bun-sqlite-session-migration"
import { filesystemShareFiles } from "#share/filesystem-share-files"
import { SharePurge } from "#share/share-purge"
import { type ShareMount, sharePublicRoutes } from "#share/share-routes"
import {
  type ShareRecord,
  SqliteShareRepository,
} from "#share/sqlite-share-repository"
import { pageHtml } from "../fixtures/public-gateway"
import { start } from "../sample-apps"
import { sharedRun } from "./shared-run"

const dayMs = 86_400_000
const videoBytes = new TextEncoder().encode("mp4-bytes")
const frameBytes = new TextEncoder().encode("jpeg-frame")

let folder: string | null = null

afterEach(() => {
  if (folder !== null) {
    rmSync(folder, { recursive: true, force: true })
  }
  folder = null
})

async function mounted(withPoster: boolean) {
  folder = mkdtempSync(join(tmpdir(), "rosesfield-share-poster-"))
  const assets = join(folder, "assets")
  const db = drizzle(":memory:")
  migrateRunTable(db)
  migrateLibraryTables(db)
  migrateSessionTables(db)
  const clock = new FixedClock({ now: start })
  const store = new FilesystemAssetStore({ root: assets })
  const shares = new SqliteShareRepository({ db })
  const mount: ShareMount = {
    shares,
    store,
    clock,
    page: async () => pageHtml,
    files: filesystemShareFiles(assets),
    limit: async () => undefined,
    needsKey: true,
  }
  const app = new Hono<GatewayEnv>()
  app.onError(errorResponse)
  sharePublicRoutes(app, mount)
  const videoKey = assetIdFormat.parse(crypto.randomUUID())
  const posterKey = assetIdFormat.parse(crypto.randomUUID())
  await store.put(videoKey, videoBytes, "video/mp4")
  if (withPoster) {
    await store.put(posterKey, frameBytes, "image/jpeg")
  }
  const now = start.getTime()
  const record: ShareRecord = {
    id: "clip1",
    runId: sharedRun.id,
    sessionId: null,
    run: sharedRun,
    media: [
      {
        key: videoKey,
        kind: "video",
        mime: "video/mp4",
        width: 1920,
        height: 1080,
        durationSeconds: 5,
        ...(withPoster
          ? { poster: { key: posterKey, mime: "image/jpeg" } }
          : {}),
      },
    ],
    placement: "link",
    createdAt: now,
    expiresAt: now + 90 * dayMs,
  }
  await shares.add(record)
  const call = (path: string) => app.request(`https://rosesfield.com${path}`)
  const purge = new SharePurge({ shares, store, clock })
  return { call, clock, purge, assets }
}

describe("a shared video's preview on X", () => {
  it("serves the poster and names it as the link's image", async () => {
    const { call } = await mounted(true)

    const poster = await call("/share/clip1/media/0/poster")
    const html = await (await call("/share/clip1")).text()

    expect(poster.status).toBe(200)
    expect(poster.headers.get("content-type")).toBe("image/jpeg")
    expect(new Uint8Array(await poster.arrayBuffer())).toEqual(frameBytes)
    expect(html).toContain(
      '<meta property="og:image" content="https://rosesfield.com/share/clip1/media/0/poster" />'
    )
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image" />'
    )
    expect(html).toContain(
      '<meta name="twitter:image" content="https://rosesfield.com/share/clip1/media/0/poster" />'
    )
    expect(html).toContain('poster="/share/clip1/media/0/poster"')
    expect(html).toContain(
      '<meta property="og:video" content="https://rosesfield.com/share/clip1/media/0" />'
    )
  })

  it("answers 404 for the poster of a video that has none", async () => {
    const { call } = await mounted(false)

    const poster = await call("/share/clip1/media/0/poster")
    const html = await (await call("/share/clip1")).text()

    expect(poster.status).toBe(404)
    expect(html).not.toContain("og:image")
    expect(html).toContain('<meta name="twitter:card" content="summary" />')
  })

  it("deletes the poster with the video when the share runs out", async () => {
    const { clock, purge, assets } = await mounted(true)

    clock.advance(91 * dayMs)
    const removed = await purge.run()

    expect(removed).toBe(1)
    expect(readdirSync(assets)).toEqual([])
  })
})
