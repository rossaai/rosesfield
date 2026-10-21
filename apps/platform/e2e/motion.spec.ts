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

test.describe("Motion's column", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("holds Move a photo and Swap a character, a Clip well and a Photo well with their limits, the model row and Generate", async ({
    page,
  }) => {
    await page.goto("/apps/motion")
    const column = page.locator('[data-slot="composer"]')
    await expect(column).toBeVisible()
    const tabs = column.getByRole("tablist")
    const move = tabs.getByRole("tab", { name: "Move a photo" })
    const swap = tabs.getByRole("tab", { name: "Swap a character" })
    await expect(move).toHaveAttribute("aria-selected", "true")
    await expect(column.locator('[data-slot="drop-well"]')).toHaveCount(2)
    await expect(column).toContainText(/MP4, MOV,? or WebM/)
    await expect(column).toContainText(/PNG, JPEG,? or WebP/)
    await expect(
      column.getByRole("button", { name: /^Model/ }).first()
    ).toBeVisible()
    await expect(column.locator('[data-slot="generate-button"]')).toBeVisible()
    await expect(
      column.getByRole("button", { name: "Pick a character" })
    ).toHaveCount(0)
    await swap.click()
    await expect(swap).toHaveAttribute("aria-selected", "true")
    await expect(column.locator('[data-slot="drop-well"]')).toHaveCount(2)
    await expect(
      column.getByRole("button", { name: "Pick a character" })
    ).toBeVisible()
  })

  test("opens on Swap a character from the old Recast address", async ({
    page,
  }) => {
    await page.goto("/apps/recast")
    await expect(page).toHaveURL(/\/apps\/motion#swap$/)
    const column = page.locator('[data-slot="composer"]')
    await expect(
      column.getByRole("tab", { name: "Swap a character" })
    ).toHaveAttribute("aria-selected", "true")
  })
})

test.describe("Motion on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the sheet is the phone's")

  test("opens the inputs in a sheet with Generate at its bottom edge, and the canvas takes the full width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/apps/motion")
    const region = page.getByRole("region", { name: "Your results" })
    await expect(region).toBeVisible()
    await expect(page.locator('[data-slot="composer"]')).toHaveCount(0)
    const canvas = await boxOf(region)
    expect(canvas.x).toBeLessThanOrEqual(16)
    expect(canvas.x + canvas.width).toBeGreaterThanOrEqual(390 - 16)
    await page.locator('[data-slot="app-bar-tabGenerate"]').click()
    const sheet = page.getByRole("dialog")
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole("tab", { name: "Move a photo" })).toBeVisible()
    await expect(
      sheet.getByRole("tab", { name: "Swap a character" })
    ).toBeVisible()
    await expect(sheet.locator('[data-slot="drop-well"]')).toHaveCount(2)
    const generate = await boxOf(sheet.locator('[data-slot="generate-button"]'))
    const sheetBox = await boxOf(sheet)
    const bottom = sheetBox.y + sheetBox.height
    expect(bottom).toBeGreaterThanOrEqual(840)
    expect(bottom - (generate.y + generate.height)).toBeLessThanOrEqual(40)
  })
})
