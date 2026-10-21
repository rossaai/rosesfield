import { readFileSync } from "node:fs"
import { deflateSync } from "node:zlib"
import { expect, type Locator, type Page, test } from "@playwright/test"

const gatewayOrigin = "http://127.0.0.1:8797"
const photoPath = new URL(
  "../src/gallery/fixtures/demo-image-16-9.png",
  import.meta.url
).pathname

const toolRow = [
  "edit",
  "angles",
  "relight",
  "try-on",
  "headshots",
  "expand",
  "background-removal",
]

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }
  return value >>> 0
})

function crcOf(bytes: Buffer): number {
  let value = 0xffffffff
  for (const byte of bytes) {
    value = (crcTable[(value ^ byte) & 0xff] ?? 0) ^ (value >>> 8)
  }
  return (value ^ 0xffffffff) >>> 0
}

function chunk(kind: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(kind, "ascii"), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crcOf(body))
  return Buffer.concat([length, body, crc])
}

function greyPng(width: number, height: number): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.writeUInt8(8, 8)
  header.writeUInt8(0, 9)
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width, 128)])
  const pixels = Buffer.concat(Array.from({ length: height }, () => row))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

async function open(page: Page, path: string): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto(path)
}

function tools(page: Page): Locator {
  return page.locator("[data-slot='edit-tools']").getByRole("tab")
}

async function chooseFile(
  page: Page,
  file: string | { name: string; mimeType: string; buffer: Buffer }
): Promise<void> {
  const chooser = page.waitForEvent("filechooser")
  await page
    .locator("[data-slot='prompt-dock']")
    .getByRole("button", { name: "References" })
    .click()
  await (await chooser).setFiles(file)
}

test("each old address opens Edit on its own tool, in the row Edit, Angles, Relight, Try-on, Headshot, Expand, Remove background", async ({
  page,
}) => {
  for (const [index, id] of toolRow.entries()) {
    if (id === "edit") {
      continue
    }
    await open(page, `/apps/${id}`)
    await expect(tools(page)).toHaveCount(toolRow.length)
    await expect(tools(page).nth(index)).toHaveAttribute(
      "aria-selected",
      "true"
    )
    await expect(page.locator("[data-slot='prompt-dock']")).toBeVisible()
  }
})

test("a photo you add shows in its own ratio and stays when you switch tools", async ({
  page,
}) => {
  await open(page, "/apps/edit")
  await chooseFile(page, photoPath)
  const shown = page.locator("[data-slot='edit-photo'] img")
  await expect(shown).toBeVisible()
  const box = await shown.boundingBox()
  expect(box === null ? 0 : box.width / box.height).toBeCloseTo(16 / 9, 1)
  await tools(page).nth(toolRow.indexOf("relight")).click()
  await expect(page).toHaveURL(/\/apps\/relight\?use=/)
  await expect(page.locator("[data-slot='edit-photo'] img")).toBeVisible()
})

test("a file that is not an image, a file over 20 MB and an image under 480 px are each refused with the reason", async ({
  page,
}) => {
  await open(page, "/apps/edit")
  const message = page.locator("[data-slot='edit-photo-message']")
  await chooseFile(page, {
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("notes"),
  })
  await expect(message).toHaveText(
    "This input takes PNG, JPEG or WebP. Pick another file."
  )
  await chooseFile(page, {
    name: "big.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(20_000_001),
  })
  await expect(message).toContainText("The limit is 20 MB.")
  await chooseFile(page, {
    name: "small.png",
    mimeType: "image/png",
    buffer: greyPng(640, 320),
  })
  await expect(message).toContainText("480 pixels on the short side")
  await expect(page.locator("[data-slot='edit-photo']")).toHaveCount(0)
})

test("Use in Edit from the library opens Edit with that image", async ({
  page,
}) => {
  const uploaded = await fetch(`${gatewayOrigin}/api/assets`, {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: readFileSync(photoPath),
  })
  const body: { asset: { id: string } } = await uploaded.json()
  await open(page, `/library?view=${body.asset.id}`)
  await page.getByRole("button", { name: "Use in" }).click()
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/apps/edit\\?use=${body.asset.id}`))
  await expect(page.locator("[data-slot='edit-photo'] img")).toBeVisible()
})

test("on a 390 px screen the settings bar stays at the bottom edge and the tool row scrolls across", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "phone", "the phone layout")
  await open(page, "/apps/edit")
  const dock = page.locator("[data-slot='prompt-dock']")
  await expect(dock.getByRole("textbox")).toBeVisible()
  await expect(dock.getByRole("button", { name: /^Generate/ })).toBeVisible()
  const before = await dock.boundingBox()
  const viewport = page.viewportSize()
  expect((before?.y ?? 0) + (before?.height ?? 0)).toBeGreaterThan(
    (viewport?.height ?? 0) - 160
  )
  await page.locator("[data-slot='app-stage-scroll']").evaluate((node) => {
    node.scrollTop = node.scrollHeight
  })
  const after = await dock.boundingBox()
  expect(after?.y).toBe(before?.y)
  const strip = page.locator("[data-slot='edit-tools'] [role='tablist']")
  const sizes = await strip.evaluate((node) => ({
    scroll: node.scrollWidth,
    client: node.clientWidth,
  }))
  expect(sizes.scroll).toBeGreaterThan(sizes.client)
  await tools(page).last().scrollIntoViewIfNeeded()
  await expect(tools(page).last()).toBeInViewport()
})
