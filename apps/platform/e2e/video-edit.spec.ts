import { expect, test } from "@playwright/test"

const tabNames = ["Edit", "Extend", "Reframe", "Background", "Frame rate"]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
})

test.describe("Video edit's column", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("shows the five tabs, then the clip well with its limits", async ({
    page,
  }) => {
    await page.goto("/apps/video-edit")
    const tabs = page
      .getByRole("tablist", { name: "Operation" })
      .getByRole("tab")
    await expect(tabs).toHaveText(tabNames)
    const well = page.locator('[data-slot="clip-well"]')
    await expect(well).toContainText("MP4, MOV or WebM")
    const tabBox = await tabs.first().boundingBox()
    const wellBox = await well.boundingBox()
    if (tabBox === null || wellBox === null) {
      throw new Error("the column has no tab or clip well")
    }
    expect(wellBox.y).toBeGreaterThan(tabBox.y + tabBox.height)
    await page.getByRole("tab", { name: "Background" }).click()
    await expect(page.getByRole("tab", { name: "Background" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    await expect(well).toBeVisible()
  })
})

test.describe("Video edit on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the sheet is the phone's")

  test("gives the canvas the full width, keeps Generate at the bottom edge and opens the inputs in a sheet", async ({
    page,
  }) => {
    await page.goto("/apps/video-edit")
    const viewport = page.viewportSize()
    const row = await page.locator('[data-slot="column-row"]').boundingBox()
    const key = page.locator('[data-slot="app-bar-tabGenerate"]')
    const keyBox = await key.boundingBox()
    if (viewport === null || row === null || keyBox === null) {
      throw new Error("the phone shows no canvas or Generate key")
    }
    expect(row.x).toBe(0)
    expect(row.width).toBe(viewport.width)
    expect(viewport.height - (keyBox.y + keyBox.height)).toBeLessThan(24)
    await key.click()
    const sheet = page.getByRole("dialog")
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole("tab")).toHaveText(tabNames)
    await expect(sheet.locator('[data-slot="clip-well"]')).toBeVisible()
    const generate = await sheet
      .getByRole("button", { name: /Generate/ })
      .last()
      .boundingBox()
    if (generate === null) {
      throw new Error("the sheet has no Generate")
    }
    expect(viewport.height - (generate.y + generate.height)).toBeLessThan(40)
  })
})
