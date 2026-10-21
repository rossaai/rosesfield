import { expect, type Locator, test } from "@playwright/test"

async function boxOf(
  locator: Locator
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("the element has no box")
  }
  return box
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
})

test.describe("Upscale's column", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("holds the Image and Video tabs, one well with its limits, Scale with 2x and 4x, the model row and Generate", async ({
    page,
  }) => {
    await page.goto("/apps/upscale")
    const column = page.locator('[data-slot="composer"]')
    await expect(column).toBeVisible()
    const tabs = column.getByRole("tablist", { name: "Mode" })
    const image = tabs.getByRole("tab", { name: "Image" })
    const video = tabs.getByRole("tab", { name: "Video" })
    await expect(image).toHaveAttribute("aria-selected", "true")
    await expect(column.locator('[data-slot="drop-well"]')).toHaveCount(1)
    await expect(column).toContainText(/PNG, JPEG,? or WebP/)
    const scale = column.getByRole("radiogroup", { name: "Scale" })
    await expect(scale.getByRole("radio")).toHaveText(["2x", "4x"])
    await expect(
      column.getByText("The result is 2x as wide and as tall as your file.")
    ).toBeVisible()
    await expect(
      column.getByRole("button", { name: /^Model/ }).first()
    ).toBeVisible()
    await expect(column.locator('[data-slot="generate-button"]')).toBeVisible()
    await video.click()
    await expect(video).toHaveAttribute("aria-selected", "true")
    await expect(column.locator('[data-slot="drop-well"]')).toHaveCount(1)
    await expect(column).toContainText(/MP4, MOV,? or WebM/)
    await expect(scale.getByRole("radio")).toHaveText(["2x", "4x"])
  })
})

test.describe("Upscale on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the sheet is the phone's")

  test("opens the inputs in a sheet with Generate at its bottom edge, and the canvas takes the full width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/apps/upscale")
    const region = page.getByRole("region", { name: "Your results" })
    await expect(region).toBeVisible()
    await expect(page.locator('[data-slot="composer"]')).toHaveCount(0)
    const canvas = await boxOf(region)
    expect(canvas.x).toBeLessThanOrEqual(16)
    expect(canvas.x + canvas.width).toBeGreaterThanOrEqual(390 - 16)
    await page.locator('[data-slot="app-bar-tabGenerate"]').click()
    const sheet = page.getByRole("dialog")
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole("tab", { name: "Image" })).toBeVisible()
    await expect(sheet.getByRole("tab", { name: "Video" })).toBeVisible()
    const generate = await boxOf(sheet.locator('[data-slot="generate-button"]'))
    const sheetBox = await boxOf(sheet)
    const bottom = sheetBox.y + sheetBox.height
    expect(bottom).toBeGreaterThanOrEqual(840)
    expect(bottom - (generate.y + generate.height)).toBeLessThanOrEqual(40)
  })
})
