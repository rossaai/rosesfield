import { expect, test } from "@playwright/test"
import { answerOwnLists } from "./own-lists"

const gatewayOrigin = "http://127.0.0.1:8797"

function padded(bytes: Uint8Array, fill: number): Uint8Array {
  const out = new Uint8Array(Math.ceil(bytes.length / 4) * 4).fill(fill)
  out.set(bytes)
  return out
}

function triangleGlb(): Uint8Array<ArrayBuffer> {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
  const bin = new Uint8Array(positions.buffer)
  const json = padded(
    new TextEncoder().encode(
      JSON.stringify({
        asset: { version: "2.0" },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        accessors: [
          { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
        ],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: bin.length }],
        buffers: [{ byteLength: bin.length }],
      })
    ),
    0x20
  )
  const length = 12 + 8 + json.length + 8 + bin.length
  const bytes = new Uint8Array(length)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, length, true)
  view.setUint32(12, json.length, true)
  view.setUint32(16, 0x4e4f534a, true)
  bytes.set(json, 20)
  view.setUint32(20 + json.length, bin.length, true)
  view.setUint32(24 + json.length, 0x004e4942, true)
  bytes.set(bin, 28 + json.length)
  return bytes
}

const own = new Set<string>()
let meshId = ""

test.beforeAll(async () => {
  const uploaded = await fetch(`${gatewayOrigin}/api/assets`, {
    method: "POST",
    headers: { "Content-Type": "model/gltf-binary" },
    body: triangleGlb(),
  })
  expect(uploaded.status).toBe(201)
  const body: { asset: { id: string; kind: string } } = await uploaded.json()
  expect(body.asset.kind).toBe("mesh")
  own.add(body.asset.id)
  meshId = body.asset.id
})

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await answerOwnLists(page, own)
})

test("a 3D model's still, drawn in its library tile, is kept on the server once and not sent again", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "desktop",
    "one browser keeps the one still the gateway holds"
  )
  const puts: string[] = []
  page.on("request", (request) => {
    if (request.method() === "PUT" && request.url().endsWith("/preview")) {
      puts.push(request.url())
    }
  })
  const previewUrl = `${gatewayOrigin}/api/assets/${meshId}/preview`
  expect((await fetch(previewUrl)).status).toBe(404)

  await page.goto("/library")
  const tile = page.locator("button[data-kind='mesh']").first()
  await expect(tile.locator("[data-slot='asset-thumb-still']")).toBeVisible()
  await expect.poll(() => puts.length).toBe(1)
  await expect.poll(async () => (await fetch(previewUrl)).status).toBe(200)
  const kept = await fetch(previewUrl)
  expect(kept.headers.get("content-type")).toMatch(/^image\/(webp|jpeg)$/)
  expect((await kept.arrayBuffer()).byteLength).toBeLessThanOrEqual(64 * 1024)

  const checked = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/assets/${meshId}/preview`) &&
      response.request().method() === "GET"
  )
  await page.reload()
  await expect(tile.locator("[data-slot='asset-thumb-still']")).toBeVisible()
  expect((await checked).status()).toBe(200)
  expect(puts).toHaveLength(1)
})
