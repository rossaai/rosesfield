import { expect, test } from "@playwright/test"

const inputs = [
  "Reference edit",
  "Character",
  "Instructions",
  "Shots with no person",
  "Keep the reference's sound",
  "Quality",
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
})

test.describe("Remake's column", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("holds the two wells with their limits, then the other inputs, Price unknown and Generate", async ({
    page,
  }) => {
    await page.goto("/apps/remake")
    const column = page.locator('[data-slot="composer"]')
    await expect(column).toBeVisible()
    await expect(column).toContainText(
      "MP4, MOV or WebM, 2 to 12 seconds, 100 MB, 2 to 6 shots"
    )
    await expect(column).toContainText("1 saved character")
    const text = (await column.innerText()).replace(/\s+/g, " ")
    const places = inputs.map((label) => text.indexOf(label))
    expect(places.every((place) => place >= 0)).toBe(true)
    expect([...places].sort((a, b) => a - b)).toEqual(places)
    await expect(column.locator('[data-slot="remake-price"]')).toHaveText(
      "Price unknown"
    )
    await expect(column.locator('[data-slot="generate-button"]')).toBeVisible()
  })
})

test.describe("Remake on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the sheet is the phone's")

  test("opens the Inputs sheet on arrival, with both wells and Generate", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/apps/remake")
    const sheet = page.getByRole("dialog")
    await expect(sheet).toBeVisible()
    await expect(sheet).toContainText("Reference edit")
    await expect(sheet).toContainText("Character")
    await expect(sheet.locator('[data-slot="generate-button"]')).toBeVisible()
  })
})
