import { expect, type Locator, test } from "@playwright/test"
import { openImagePicker } from "./image-picker"
import { expectTip } from "./well-tip"

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

  test("holds one mode with no tab row: a Clip well and a Photo well with their limits, Pick a character, the model row and Generate", async ({
    page,
  }) => {
    await page.goto("/apps/motion")
    const column = page.locator('[data-slot="composer"]')
    await expect(column).toBeVisible()
    await expect(column.getByRole("tablist")).toHaveCount(0)
    const wells = column.locator('[data-slot="drop-well"]')
    await expect(wells).toHaveCount(2)
    await expectTip(page, wells.nth(0), /MP4, MOV,? or WebM/)
    await expectTip(page, wells.nth(1), /PNG, JPEG,? or WebP/)
    await expect(
      column.getByRole("button", { name: "Pick a character" })
    ).toBeVisible()
    await expect(
      column.getByRole("button", { name: /^Model/ }).first()
    ).toBeVisible()
    await expect(column.locator('[data-slot="generate-button"]')).toBeVisible()
  })

  test("opens on the same column from the old Recast address", async ({
    page,
  }) => {
    await page.goto("/apps/recast")
    await expect(page).toHaveURL(/\/apps\/motion#swap$/)
    const column = page.locator('[data-slot="composer"]')
    await expect(column.getByRole("tablist")).toHaveCount(0)
    await expect(
      column.getByRole("button", { name: "Pick a character" })
    ).toBeVisible()
  })
})

test.describe("Follow a guide", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("is the LTX 2.3 depth guide row of the one model list: picking it names the video well Guide video with its note, and picking the control graph names it Clip again", async ({
    page,
  }) => {
    await page.goto("/apps/motion")
    const column = page.locator('[data-slot="composer"]')
    await expect(column.getByRole("tablist")).toHaveCount(0)
    await openImagePicker(page)
    await page
      .getByRole("listbox")
      .locator("[data-slot='model-row']", { hasText: "LTX 2.3 depth guide" })
      .click()
    await expect(column.getByText("Guide video")).toBeVisible()
    await expect(
      column.getByText(/A depth video that sets the camera/)
    ).toBeVisible()
    await expect(column.locator('[data-slot="drop-well"]')).toHaveCount(2)
    await openImagePicker(page)
    await page
      .getByRole("listbox")
      .locator("[data-slot='model-row']", { hasText: "LTX 2.3 control" })
      .click()
    await expect(column.getByText("Guide video")).toHaveCount(0)
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
    await expect(sheet.getByRole("tablist")).toHaveCount(0)
    await expect(sheet.locator('[data-slot="drop-well"]')).toHaveCount(2)
    const generate = await boxOf(sheet.locator('[data-slot="generate-button"]'))
    const sheetBox = await boxOf(sheet)
    const bottom = sheetBox.y + sheetBox.height
    expect(bottom).toBeGreaterThanOrEqual(840)
    expect(bottom - (generate.y + generate.height)).toBeLessThanOrEqual(40)
  })
})
