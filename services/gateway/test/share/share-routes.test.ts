import { readdirSync } from "node:fs"
import { join } from "node:path"
import {
  assetResponse,
  buildPath,
  errorEnvelope,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { afterEach, describe, expect, it } from "vitest"
import { keyHeaders } from "#session/visitor-keys"
import { shareResponse, shareRoutes } from "#share/share.contract"
import {
  finishedRun,
  type OpenedGateway,
  openGateway,
} from "../fixtures/public-gateway"
import type { Visitor } from "../fixtures/visitor"
import { pngBytes } from "../sample-apps"

const key = "comfyui-share-key-account1"
const dayMs = 86_400_000

let opened: OpenedGateway | null = null

afterEach(async () => {
  await opened?.close()
  opened = null
})

async function share(visitor: Visitor, runId: string): Promise<Response> {
  return visitor.call(buildPath(shareRoutes.shareRun.path, { runId }), {
    method: "POST",
  })
}

async function sharedRun(gateway: OpenedGateway) {
  const owner = gateway.visitor({ [keyHeaders.engine]: key })
  const run = await finishedRun(owner, "a red door")
  const made = await share(owner, run.id)
  return { owner, run, made, view: shareResponse.parse(await made.json()) }
}

async function codeOf(response: Response): Promise<string> {
  return errorEnvelope.parse(await response.json()).error.code
}

describe("a shared result", () => {
  it("gets a public link whose data, bytes and page a stranger reads without a cookie", async () => {
    opened = openGateway()
    const { made, view, run } = await sharedRun(opened)
    const stranger = opened.visitor()

    const data = await stranger.call(`${view.share.path}/data`)
    const media = await stranger.call(`${view.share.path}/media/0`)
    const page = await stranger.call(view.share.path)
    const html = await page.text()

    expect(made.status).toBe(201)
    expect(shareResponse.parse(await data.json()).share.id).toBe(view.share.id)
    expect(view.share.run.inputs.prompt).toBe("a red door")
    expect(view.share.run.appId).toBe(run.appId)
    expect(new Uint8Array(await media.arrayBuffer())).toEqual(pngBytes)
    expect(media.headers.get("cache-control")).toContain("public")
    expect(html).toContain(
      `<meta property="og:image" content="https://demo.rosesfield.test${view.share.path}/media/0" />`
    )
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image" />'
    )
    expect(html).toContain(`href="/apps/sample-image?share=${view.share.id}"`)
  })

  it("answers a byte range, so a phone can play a shared video", async () => {
    opened = openGateway()
    const { view } = await sharedRun(opened)

    const part = await opened
      .visitor()
      .call(`${view.share.path}/media/0`, { headers: { range: "bytes=0-3" } })

    expect(part.status).toBe(206)
    expect(part.headers.get("content-range")).toBe(
      `bytes 0-3/${pngBytes.length}`
    )
    expect(new Uint8Array(await part.arrayBuffer())).toEqual(
      pngBytes.slice(0, 4)
    )
  })

  it("keeps one link per run, and leaves out the photos the run took", async () => {
    opened = openGateway()
    const owner = opened.visitor({ [keyHeaders.engine]: key })
    const uploaded = assetResponse.parse(
      await (
        await owner.call(routes.uploadAsset.path, {
          method: "POST",
          headers: { "content-type": "image/png" },
          body: pngBytes,
        })
      ).json()
    ).asset
    const started = runResponse.parse(
      await (
        await owner.call(
          buildPath(routes.startRun.path, { appId: "sample-image" }),
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              inputs: { prompt: "a red door", references: [uploaded.id] },
            }),
          }
        )
      ).json()
    ).run
    const runPath = buildPath(routes.getRun.path, { runId: started.id })
    await owner.call(runPath)
    await owner.call(runPath)

    const first = shareResponse.parse(
      await (await share(owner, started.id)).json()
    )
    const second = shareResponse.parse(
      await (await share(owner, started.id)).json()
    )

    expect(second.share.id).toBe(first.share.id)
    expect(first.share.run.inputs.references).toEqual([])
    expect(JSON.stringify(first.share)).not.toContain(uploaded.id)
  })

  it("refuses a run that has not finished, and a run of another account", async () => {
    opened = openGateway()
    const owner = opened.visitor({ [keyHeaders.engine]: key })
    const queued = runResponse.parse(
      await (
        await owner.call(
          buildPath(routes.startRun.path, { appId: "sample-image" }),
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ inputs: { prompt: "a red door" } }),
          }
        )
      ).json()
    ).run
    const early = await share(owner, queued.id)
    const done = await finishedRun(owner, "a blue door")
    const other = opened.visitor({
      [keyHeaders.engine]: "comfyui-share-key-account2",
    })
    const foreign = await share(other, done.id)

    expect(early.status).toBe(412)
    expect(await codeOf(early)).toBe("SHARE_NOT_READY")
    expect(foreign.status).toBe(404)
    expect(await codeOf(foreign)).toBe("RUN_NOT_FOUND")
  })

  it("stays public for 90 days, then the purge deletes its bytes", async () => {
    opened = openGateway()
    const { owner, view } = await sharedRun(opened)
    const stranger = opened.visitor()
    const sharesOnDisk = (): number =>
      readdirSync(join(opened?.dataDir ?? "", "assets")).length

    opened.clock.advance(89 * dayMs)
    await owner.call(routes.listRuns.path)
    const kept = await stranger.call(`${view.share.path}/data`)
    const before = sharesOnDisk()
    opened.clock.advance(2 * dayMs)
    const gone = await stranger.call(`${view.share.path}/data`)
    const purged = await opened.gateway.purge()

    expect(kept.status).toBe(200)
    expect(gone.status).toBe(404)
    expect(await codeOf(gone)).toBe("SHARE_NOT_FOUND")
    expect(purged.shares).toBe(1)
    expect(sharesOnDisk()).toBe(before - 1)
  })
})
