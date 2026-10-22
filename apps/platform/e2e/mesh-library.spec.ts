import { expect, test } from "@playwright/test"
import { answerOwnLists } from "./own-lists"

const gatewayOrigin = "http://127.0.0.1:8797"

function glb(): Uint8Array {
  const json = new TextEncoder().encode('{"asset":{"version":"2.0"}} ')
  const bytes = new Uint8Array(20 + json.length)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, bytes.length, true)
  view.setUint32(12, json.length, true)
  view.setUint32(16, 0x4e4f534a, true)
  bytes.set(json, 20)
  return bytes
}

const own = new Set<string>()
let uploadedId = ""

test.beforeAll(async () => {
  const uploaded = await fetch(`${gatewayOrigin}/api/assets`, {
    method: "POST",
    headers: { "Content-Type": "model/gltf-binary" },
    body: glb(),
  })
  expect(uploaded.status).toBe(201)
  const body: { asset: { id: string; kind: string } } = await uploaded.json()
  expect(body.asset.kind).toBe("mesh")
  own.add(body.asset.id)
  uploadedId = body.asset.id
})

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await answerOwnLists(page, own)
})

test("a GLB in the library shows as a tile with the 3D mark, and pressing it opens that GLB in 3D's viewer", async ({
  page,
}) => {
  await page.goto("/library")
  const tile = page.locator("button[data-kind='mesh']").first()
  await expect(tile).toBeVisible()
  await expect(
    tile.locator("[data-slot='asset-thumb-mark'] svg.lucide-box")
  ).toBeVisible()
  await tile.click()
  await expect(page).toHaveURL(
    new RegExp(`/apps/three-d\\?open=${uploadedId}$`)
  )
  const viewer = page.locator("[data-slot='mesh-output']")
  await expect(viewer).toHaveCount(1)
  await expect(viewer.getByRole("button", { name: "Download" })).toBeVisible()
  await expect(
    page.getByRole("tab", { name: "From text" }).first()
  ).toBeVisible()
})
