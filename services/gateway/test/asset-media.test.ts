import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import {
  assetLink,
  assetResponse,
  buildPath,
  errorEnvelope,
  routes,
} from "@rosesfield/contract"
import { afterEach, describe, expect, it } from "vitest"
import { ContentLinks } from "#lock/content-links"
import { keyHeaders } from "#session/visitor-keys"
import { finishedRun, openGateway } from "./fixtures/public-gateway"
import { type Harness, harnessFor } from "./harness"
import { localPorts } from "./local-ports"
import { ownerToken, start } from "./sample-apps"

const video = Uint8Array.from({ length: 1000 }, (_, at) => at % 251)
const webp = Uint8Array.of(
  0x52,
  0x49,
  0x46,
  0x46,
  0x0c,
  0,
  0,
  0,
  0x57,
  0x45,
  0x42,
  0x50
)
const bearer = { authorization: `Bearer ${ownerToken}` }

let harness: Harness | null = null

afterEach(() => {
  harness?.close()
  harness = null
})

function open(lock: "local" | "token"): Harness {
  harness = harnessFor({
    portsFor: localPorts,
    lock:
      lock === "local"
        ? { mode: "local" }
        : { mode: "token", token: ownerToken },
  })
  return harness
}

async function uploaded(
  gateway: Harness,
  bytes: Uint8Array,
  mime: string,
  headers: Record<string, string> = {}
): Promise<string> {
  const response = await gateway.call(routes.uploadAsset.path, {
    method: "POST",
    headers: { "content-type": mime, ...headers },
    body: bytes,
  })
  return assetResponse.parse(await response.json()).asset.id
}

async function codeOf(response: Response): Promise<string> {
  return errorEnvelope.parse(await response.json()).error.code
}

function contentPath(assetId: string): string {
  return buildPath(routes.readAssetContent.path, { assetId })
}

function previewPath(assetId: string): string {
  return buildPath(routes.readAssetPreview.path, { assetId })
}

describe("the asset content route", () => {
  it("answers a Range request with 206 and only those bytes", async () => {
    const gateway = open("local")
    const assetId = await uploaded(gateway, video, "video/mp4")
    const response = await gateway.call(contentPath(assetId), {
      headers: { range: "bytes=100-199" },
    })
    expect(response.status).toBe(206)
    expect(response.headers.get("content-range")).toBe("bytes 100-199/1000")
    expect(response.headers.get("accept-ranges")).toBe("bytes")
    expect(response.headers.get("content-type")).toBe("video/mp4")
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      video.slice(100, 200)
    )
  })

  it("answers an open range and a suffix range from the file's size", async () => {
    const gateway = open("local")
    const assetId = await uploaded(gateway, video, "video/mp4")
    const tail = await gateway.call(contentPath(assetId), {
      headers: { range: "bytes=990-" },
    })
    const suffix = await gateway.call(contentPath(assetId), {
      headers: { range: "bytes=-3" },
    })
    expect(tail.headers.get("content-range")).toBe("bytes 990-999/1000")
    expect(new Uint8Array(await tail.arrayBuffer())).toEqual(video.slice(990))
    expect(suffix.headers.get("content-range")).toBe("bytes 997-999/1000")
  })

  it("answers a range past the file's end with 416 and the size", async () => {
    const gateway = open("local")
    const assetId = await uploaded(gateway, video, "video/mp4")
    const response = await gateway.call(contentPath(assetId), {
      headers: { range: "bytes=1000-1001" },
    })
    expect(response.status).toBe(416)
    expect(response.headers.get("content-range")).toBe("bytes */1000")
  })

  it("answers with no range with 200 and the whole file", async () => {
    const gateway = open("local")
    const assetId = await uploaded(gateway, video, "video/mp4")
    const response = await gateway.call(contentPath(assetId))
    expect(response.status).toBe(200)
    expect(response.headers.get("accept-ranges")).toBe("bytes")
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(video)
  })
})

describe("a signed content link in owner mode", () => {
  it("plays the asset's content with no header for 10 minutes", async () => {
    const gateway = open("token")
    const assetId = await uploaded(gateway, video, "video/mp4", bearer)
    const answer = await gateway.call(
      buildPath(routes.linkAssetContent.path, { assetId }),
      { headers: bearer }
    )
    const link = assetLink.parse(await answer.json())
    expect(link.url.startsWith(contentPath(assetId))).toBe(true)
    expect(link.expiresAt).toBe(
      new Date(start.getTime() + ContentLinks.lifetimeMs).toISOString()
    )
    const played = await gateway.call(link.url, {
      headers: { range: "bytes=0-9" },
    })
    expect(played.status).toBe(206)
    expect(new Uint8Array(await played.arrayBuffer())).toEqual(
      video.slice(0, 10)
    )
    gateway.clock.advance(ContentLinks.lifetimeMs)
    const late = await gateway.call(link.url)
    expect(late.status).toBe(401)
    expect(await codeOf(late)).toBe("OWNER_TOKEN_MISSING")
  })

  it("opens no other asset and no other route", async () => {
    const gateway = open("token")
    const assetId = await uploaded(gateway, video, "video/mp4", bearer)
    const other = await uploaded(gateway, webp, "image/webp", bearer)
    const answer = await gateway.call(
      buildPath(routes.linkAssetContent.path, { assetId }),
      { headers: bearer }
    )
    const { url } = assetLink.parse(await answer.json())
    const search = url.slice(url.indexOf("?"))
    const elsewhere = [
      `${contentPath(other)}${search}`,
      `${buildPath(routes.getAsset.path, { assetId })}${search}`,
      `${previewPath(assetId)}${search}`,
      url.replace(/signature=([0-9a-f])/, (_, first) =>
        first === "0" ? "signature=1" : "signature=0"
      ),
      url.replace(/expires=\d+/, `expires=${start.getTime() + 3_600_000}`),
    ]
    for (const path of elsewhere) {
      const response = await gateway.call(path)
      expect(response.status, path).toBe(401)
    }
  })

  it("is refused for an asset the owner does not hold", async () => {
    const gateway = open("token")
    const response = await gateway.call(
      buildPath(routes.linkAssetContent.path, {
        assetId: "6a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
      }),
      { headers: bearer }
    )
    expect(response.status).toBe(404)
  })

  it("is the plain content path on your machine with no owner token", async () => {
    const gateway = open("local")
    const assetId = await uploaded(gateway, video, "video/mp4")
    const answer = await gateway.call(
      buildPath(routes.linkAssetContent.path, { assetId })
    )
    expect(assetLink.parse(await answer.json()).url).toBe(contentPath(assetId))
  })
})

describe("a signed content link in public mode", () => {
  it("reads the visitor's own asset with no cookie and no key, and nobody else's", async () => {
    const opened = openGateway()
    try {
      const owner = opened.visitor({ [keyHeaders.engine]: "comfyui-owner" })
      const run = await finishedRun(owner, "a red door")
      expect(run.status).toBe("done")
      const assetId = run.outputs[0] ?? ""
      const answer = await owner.call(
        buildPath(routes.linkAssetContent.path, { assetId })
      )
      const { url } = assetLink.parse(await answer.json())
      expect(new URL(url, "https://x.test").searchParams.get("session")).toBe(
        owner.cookie?.split(".")[0]?.split("~")[0] ?? null
      )
      const stranger = opened.visitor()
      const played = await stranger.call(url)
      expect(played.status).toBe(200)
      expect(stranger.cookie).toBeNull()
      const strangers = await stranger.call(
        buildPath(routes.linkAssetContent.path, { assetId })
      )
      expect(strangers.status).toBe(404)
      const forged = url.replace(
        /session=[^&]+/,
        "session=0b8f3c2e-5a4d-4c1b-9e7f-2d6a8b9c0e1f"
      )
      const refused = await opened.visitor().call(forged)
      expect(refused.status).toBe(404)
    } finally {
      await opened.close()
    }
  })
})

describe("the asset preview routes", () => {
  it("keep a WebP preview the browser sends and read it back", async () => {
    const gateway = open("local")
    const assetId = await uploaded(gateway, video, "video/mp4")
    const before = await gateway.call(previewPath(assetId))
    expect(before.status).toBe(404)
    expect(await codeOf(before)).toBe("ASSET_PREVIEW_NOT_FOUND")
    const sent = await gateway.call(previewPath(assetId), {
      method: "PUT",
      headers: { "content-type": "image/webp" },
      body: webp,
    })
    expect(sent.status).toBe(204)
    const read = await gateway.call(previewPath(assetId))
    expect(read.status).toBe(200)
    expect(read.headers.get("content-type")).toBe("image/webp")
    expect(new Uint8Array(await read.arrayBuffer())).toEqual(webp)
  })

  it("take only image/webp or image/jpeg, up to 64 KB", async () => {
    const gateway = open("local")
    const assetId = await uploaded(gateway, video, "video/mp4")
    const png = await gateway.call(previewPath(assetId), {
      method: "PUT",
      headers: { "content-type": "image/png" },
      body: Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    })
    expect(png.status).toBe(400)
    expect(await codeOf(png)).toBe("ASSET_PREVIEW_INVALID")
    const big = new Uint8Array(64 * 1024 + 1)
    big.set(webp)
    const tooBig = await gateway.call(previewPath(assetId), {
      method: "PUT",
      headers: { "content-type": "image/webp" },
      body: big,
    })
    expect(tooBig.status).toBe(400)
    expect(await codeOf(tooBig)).toBe("BODY_TOO_LARGE")
    expect((await gateway.call(previewPath(assetId))).status).toBe(404)
  })

  it("is refused for an asset of another owner", async () => {
    const opened = openGateway()
    try {
      const owner = opened.visitor({ [keyHeaders.engine]: "comfyui-owner" })
      const run = await finishedRun(owner, "a red door")
      expect(run.status).toBe("done")
      const assetId = run.outputs[0] ?? ""
      const stranger = opened.visitor()
      const sent = await stranger.call(previewPath(assetId), {
        method: "PUT",
        headers: { "content-type": "image/webp" },
        body: webp,
      })
      expect(sent.status).toBe(404)
      expect((await owner.call(previewPath(assetId))).status).toBe(404)
    } finally {
      await opened.close()
    }
  })

  it("keep a 3D model's still for its visitor alone, and refuse it to another visitor", async () => {
    const opened = openGateway()
    try {
      const owner = opened.visitor({ [keyHeaders.engine]: "comfyui-owner" })
      const glb = Uint8Array.of(0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0)
      const uploadedMesh = await owner.call(routes.uploadAsset.path, {
        method: "POST",
        headers: { "content-type": "model/gltf-binary" },
        body: glb,
      })
      const mesh = assetResponse.parse(await uploadedMesh.json()).asset
      expect(mesh.kind).toBe("mesh")
      const stranger = opened.visitor({ [keyHeaders.engine]: "comfyui-other" })
      const strangers = await stranger.call(previewPath(mesh.id), {
        method: "PUT",
        headers: { "content-type": "image/webp" },
        body: webp,
      })
      expect(strangers.status).toBe(404)
      expect((await owner.call(previewPath(mesh.id))).status).toBe(404)
      const kept = await owner.call(previewPath(mesh.id), {
        method: "PUT",
        headers: { "content-type": "image/webp" },
        body: webp,
      })
      expect(kept.status).toBe(204)
      const read = await owner.call(previewPath(mesh.id))
      expect(new Uint8Array(await read.arrayBuffer())).toEqual(webp)
      expect((await stranger.call(previewPath(mesh.id))).status).toBe(404)
    } finally {
      await opened.close()
    }
  })

  it("is deleted with its asset", async () => {
    const gateway = open("local")
    const assetId = await uploaded(gateway, video, "video/mp4")
    await gateway.call(previewPath(assetId), {
      method: "PUT",
      headers: { "content-type": "image/webp" },
      body: webp,
    })
    const folder = join(gateway.folder, "assets")
    expect(readdirSync(folder).sort()).toEqual([assetId, `${assetId}.preview`])
    const deleted = await gateway.call(
      buildPath(routes.deleteAsset.path, { assetId }),
      { method: "DELETE" }
    )
    expect(deleted.status).toBe(204)
    expect(existsSync(join(folder, `${assetId}.preview`))).toBe(false)
  })
})

describe("the public purge and the preview", () => {
  it("deletes a preview with its expired asset", async () => {
    const opened = openGateway({ settings: { RETENTION_DAYS: "7" } })
    try {
      const owner = opened.visitor({ [keyHeaders.engine]: "comfyui-owner" })
      const run = await finishedRun(owner, "a red door")
      expect(run.status).toBe("done")
      const assetId = run.outputs[0] ?? ""
      await owner.call(previewPath(assetId), {
        method: "PUT",
        headers: { "content-type": "image/webp" },
        body: webp,
      })
      const preview = join(opened.dataDir, "assets", `${assetId}.preview`)
      expect(existsSync(preview)).toBe(true)
      opened.clock.advance(8 * 86_400_000)
      await opened.gateway.purge()
      expect(existsSync(preview)).toBe(false)
    } finally {
      await opened.close()
    }
  })
})
