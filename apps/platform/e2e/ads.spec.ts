import { deflateSync } from "node:zlib"
import { expect, type Locator, type Page, test } from "@playwright/test"

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

function greyPng(side: number, shade: number): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(side, 0)
  header.writeUInt32BE(side, 4)
  header.writeUInt8(8, 8)
  header.writeUInt8(0, 9)
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(side, shade)])
  const pixels = Buffer.concat(Array.from({ length: side }, () => row))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

function photo(shade: number): {
  name: string
  mimeType: string
  buffer: Buffer
} {
  return {
    name: `product-${shade}.png`,
    mimeType: "image/png",
    buffer: greyPng(512, shade),
  }
}

async function openAds(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/apps/ads")
}

function dock(page: Page): Locator {
  return page.locator("[data-slot='prompt-dock']")
}

async function addPhotos(
  page: Page,
  files: ReturnType<typeof photo>[]
): Promise<void> {
  await dock(page).getByRole("button", { name: "Attach a file" }).click()
  const chooser = page.waitForEvent("filechooser")
  await page.getByRole("menuitem", { name: "Upload" }).click()
  await (await chooser).setFiles(files)
}

test.describe("Ads on a wide screen", () => {
  test.skip(({ isMobile }) => isMobile, "the bar shows its chips from 768 px")

  test("shows the empty canvas and asks for a photo before any run", async ({
    page,
  }) => {
    await openAds(page)
    await page.getByRole("tab", { name: "History" }).click()
    await expect(
      page.getByText("Your product shots and ads show here")
    ).toBeVisible()
    await expect(
      page.getByText("Add your inputs, then press Generate.")
    ).toBeVisible()
    await dock(page).locator("[data-slot='generate-button']").click()
    await expect(dock(page).getByRole("alert")).toContainText(
      "Add a photo of your product."
    )
    await expect(
      dock(page).getByRole("button", { name: "Attach a file" })
    ).toBeFocused()
  })

  test("keeps the first 3 photos, refuses a fourth, and moves the third up when you remove the second", async ({
    page,
  }) => {
    await openAds(page)
    await addPhotos(page, [photo(40), photo(120), photo(200)])
    const thumbs = dock(page).locator("[data-bar='prompt'] li img")
    await expect(thumbs).toHaveCount(3)
    const third = await thumbs.nth(2).getAttribute("src")
    await addPhotos(page, [photo(250)])
    await expect(dock(page).getByRole("alert")).toContainText(
      "This input takes up to 3."
    )
    await expect(thumbs).toHaveCount(3)
    await dock(page).getByRole("button", { name: "Remove" }).nth(1).click()
    await expect(thumbs).toHaveCount(2)
    await expect(
      dock(page).getByRole("region", { name: "Second photo" }).locator("img")
    ).toHaveAttribute("src", third ?? "")
  })
})

test.describe("the Ads model menu", () => {
  test.skip(({ isMobile }) => isMobile, "the bar shows its chips from 768 px")

  test("opens on Qwen Image Edit 2511 as rank 1 of the featured row, the next row rank 2, each row with the photos it takes, and Generate never reads 0", async ({
    page,
  }) => {
    await openAds(page)
    const trigger = dock(page).getByRole("button", { name: /^Model/ })
    await expect(trigger).toContainText("Qwen Image Edit 2511")
    await trigger.click()
    const featured = page.getByRole("group", { name: "Featured" })
    const rows = featured.locator("[data-slot='model-row']")
    const rankOf = (row: Locator): Locator =>
      row.locator("[data-slot='model-row-capability']").first()
    await expect(rows.first()).toContainText("Qwen Image Edit 2511")
    await expect(rankOf(rows.first())).toHaveText("1")
    await expect(rankOf(rows.nth(1))).toHaveText("2")
    expect(await rows.count()).toBeLessThanOrEqual(3)
    await expect(rows.first()).toContainText("Up to 3 images")
    const listed = page.getByRole("listbox").locator("[data-slot='model-row']")
    expect(await listed.count()).toBeGreaterThan(2)
    for (const row of await listed.all()) {
      await expect(row).toContainText(/Up to \d+ images?/)
    }
    await page.keyboard.press("Escape")
    await expect(
      dock(page).getByRole("button", { name: /^Generate, 0 Comfy credits$/ })
    ).toHaveCount(0)
  })
})

test.describe("Ads on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the phone layout")

  test("docks the prompt, the attach button, the character button, Inputs and Generate, and the Inputs sheet holds the settings", async ({
    page,
  }) => {
    await openAds(page)
    const bar = dock(page)
    await expect(bar.getByRole("textbox")).toBeVisible()
    await expect(
      bar.getByRole("button", { name: "Attach a file" })
    ).toBeVisible()
    await expect(
      bar.getByRole("button", { name: "Add a character" })
    ).toBeVisible()
    await expect(
      bar.locator("[data-slot='generate-button']").first()
    ).toBeVisible()
    const width = await page.evaluate(
      () => document.documentElement.scrollWidth
    )
    expect(width).toBeLessThanOrEqual(390)
    await bar.getByRole("button", { name: "Inputs" }).click()
    const sheet = page.getByRole("dialog")
    await expect(sheet).toBeVisible()
    await expect(
      sheet.getByRole("button", { name: /^Model/ }).first()
    ).toContainText("Qwen Image Edit 2511")
    await expect(sheet.getByText("Model", { exact: true })).toHaveCount(0)
    for (const label of ["Kind", "Format", "Count", "Style"]) {
      await expect(
        sheet.getByText(label, { exact: true }).first()
      ).toBeVisible()
    }
    await expect(
      sheet.getByRole("button", { name: "Advanced", exact: true })
    ).toBeVisible()
  })
})
