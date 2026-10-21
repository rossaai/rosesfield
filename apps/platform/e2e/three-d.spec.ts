import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
})

test.describe("3D's column", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("opens on From an image with its model row and Generate, and moves to From text", async ({
    page,
  }) => {
    await page.goto("/apps/three-d")
    const column = page.locator("aside")
    const tabs = column.getByRole("tablist", { name: "Make a 3D model" })
    const image = tabs.getByRole("tab", { name: "From an image" })
    const text = tabs.getByRole("tab", { name: "From text" })
    await expect(image).toHaveAttribute("aria-selected", "true")
    await expect(column.getByRole("button", { name: /^Model/ })).toBeVisible()
    await expect(
      column.getByRole("button", { name: /Generate/ }).last()
    ).toBeVisible()
    await text.click()
    await expect(text).toHaveAttribute("aria-selected", "true")
  })
})

test.describe("3D on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the sheet is the phone's")

  test("opens the inputs in a sheet with Generate at its bottom edge", async ({
    page,
  }) => {
    await page.goto("/apps/three-d")
    await page.locator('[data-slot="app-bar-tabGenerate"]').click()
    const sheet = page.getByRole("dialog")
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole("tab", { name: "From an image" })).toBeVisible()
    const generate = await sheet
      .getByRole("button", { name: /Generate/ })
      .last()
      .boundingBox()
    const viewport = page.viewportSize()
    if (generate === null || viewport === null) {
      throw new Error("the sheet shows no Generate")
    }
    expect(viewport.height - (generate.y + generate.height)).toBeLessThan(48)
  })
})
