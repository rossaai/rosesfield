import { expect, type Locator, type Page, test } from "@playwright/test"

const scene = "A boat leaves the harbor"

const selects = [
  "Movement",
  "Camera",
  "Lens",
  "Focus",
  "Light",
  "Color",
  "Mood",
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
})

async function pick(
  page: Page,
  choices: Locator,
  list: string,
  value: string
): Promise<void> {
  await choices.getByRole("combobox", { name: list, exact: true }).click()
  await page.getByRole("option", { name: value, exact: true }).click()
  await expect(page.getByRole("listbox")).toHaveCount(0)
}

test.describe("Shot's input column", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("opens with 7 shot choices on Auto and the seed under a closed Advanced, and shows the words each choice adds", async ({
    page,
  }) => {
    await page.goto("/apps/shot")
    const choices = page.locator('[data-slot="shot-choices"]')
    await expect(choices).toBeVisible()
    for (const list of selects) {
      await expect(
        choices.getByRole("combobox", { name: list, exact: true })
      ).toHaveText("Auto")
    }
    const advanced = page.getByRole("button", { name: "Advanced", exact: true })
    await expect(advanced).toBeVisible()
    const seed = page.getByRole("radiogroup", { name: "Seed" })
    await expect(seed).toBeHidden()
    await advanced.click()
    await expect(seed).toBeVisible()
    await page.getByRole("textbox", { name: "Scene" }).fill(scene)
    const words = page.getByRole("region", { name: "Words Shot sends" })
    await expect(words).toContainText(`${scene}.`)
    await pick(page, choices, "Movement", "Push in")
    await pick(page, choices, "Light", "Night")
    await pick(page, choices, "Color", "Black and white")
    await expect(words).toContainText(
      `${scene}. The camera moves slowly toward the subject. Night lighting. Black and white, with no color.`
    )
    await pick(page, choices, "Light", "Auto")
    await expect(words).not.toContainText("Night lighting.")
    await expect(words).toContainText("Black and white, with no color.")
  })
})

test.describe("Shot's Inputs sheet on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the sheet is the phone's")

  test("holds the scene, the 7 shot choices and the words Shot sends", async ({
    page,
  }) => {
    await page.goto("/apps/shot")
    await expect(
      page.getByRole("region", { name: "Your results" })
    ).toBeVisible()
    await page.locator('[data-slot="app-bar-tabGenerate"]').click()
    const sheet = page.getByRole("dialog")
    await expect(sheet).toBeVisible()
    await sheet.getByRole("textbox", { name: "Scene" }).fill(scene)
    const choices = sheet.locator('[data-slot="shot-choices"]')
    for (const list of selects) {
      await expect(
        choices.getByRole("combobox", { name: list, exact: true })
      ).toHaveText("Auto")
    }
    await pick(page, choices, "Mood", "Calm")
    await expect(
      sheet.getByRole("region", { name: "Words Shot sends" })
    ).toContainText(`${scene}. A calm mood.`)
  })
})
