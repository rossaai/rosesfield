import { expect, test } from "@playwright/test"

const tabNames = [
  "Speech",
  "Voice clone",
  "Voice change",
  "Music",
  "Sound effects",
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
})

test.describe("Audio's column", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("shows five tabs, each with its inputs, the model row and Generate", async ({
    page,
  }) => {
    await page.goto("/apps/audio")
    const tabs = page.getByRole("tab")
    await expect(tabs).toHaveText(tabNames)
    for (const name of tabNames) {
      await page.getByRole("tab", { name }).click()
      await expect(page.getByRole("tab", { name })).toHaveAttribute(
        "aria-selected",
        "true"
      )
      await expect(
        page.getByRole("button", { name: /^Model/ }).first()
      ).toBeVisible()
      await expect(
        page.getByRole("button", { name: /^Generate/ }).first()
      ).toBeVisible()
    }
  })

  test("opens the old Voice address on Audio's Voice clone", async ({
    page,
  }) => {
    await page.goto("/apps/voice")
    await expect(page).toHaveURL(/\/apps\/audio#voice-clone$/)
    await expect(
      page.getByRole("tab", { name: "Voice clone" })
    ).toHaveAttribute("aria-selected", "true")
  })
})

test.describe("Audio on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the sheet is the phone's")

  test("opens the inputs in a sheet whose Generate sits at the bottom edge", async ({
    page,
  }) => {
    await page.goto("/apps/audio")
    await page.locator('[data-slot="app-bar-tabGenerate"]').click()
    const sheet = page.getByRole("dialog")
    await expect(sheet.getByRole("tab", { name: "Speech" })).toBeVisible()
    const generate = await sheet
      .getByRole("button", { name: /^Generate/ })
      .boundingBox()
    const viewport = page.viewportSize()
    if (generate === null || viewport === null) {
      throw new Error("the sheet shows no Generate")
    }
    expect(viewport.height - (generate.y + generate.height)).toBeLessThan(48)
  })
})
