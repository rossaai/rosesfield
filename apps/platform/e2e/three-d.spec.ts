import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
})

test.describe("3D's column", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("opens on From text with Meshy 7.1, its prompt and Generate with its price, and hides From an image while the catalog lists no model for it", async ({
    page,
  }) => {
    await page.goto("/apps/three-d")
    const column = page.locator("aside")
    const tabs = column.getByRole("tablist", { name: "Make a 3D model" })
    const text = tabs.getByRole("tab", { name: "From text" })
    await expect(text).toHaveAttribute("aria-selected", "true")
    await expect(tabs.getByRole("tab", { name: "From an image" })).toHaveCount(
      0
    )
    const picker = column.getByRole("button", { name: /^Model/ })
    await expect(picker).toContainText("7.1")
    await expect(column.getByRole("textbox").first()).toBeVisible()
    await expect(
      column.getByRole("button", { name: /Generate.*Comfy credits/ }).last()
    ).toBeVisible()
  })

  test("lists the catalog's 3D models from text in the picker, each with its maker", async ({
    page,
  }) => {
    await page.goto("/apps/three-d")
    const column = page.locator("aside")
    await column.getByRole("button", { name: /^Model/ }).click()
    const rows = page.locator("[role='listbox'] [data-slot='model-row']")
    await expect(rows.first()).toBeVisible()
    const names = await rows
      .locator("[data-slot='model-row-name']")
      .allTextContents()
    expect(names.some((name) => name.includes("7.1"))).toBe(true)
    expect(names.length).toBeGreaterThan(1)
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
    await expect(sheet.getByRole("tab", { name: "From text" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
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
