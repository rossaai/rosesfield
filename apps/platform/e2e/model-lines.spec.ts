import { expect, test } from "@playwright/test"
import { keepDeclaredModels } from "./last-used"

test.beforeEach(async ({ page }) => {
  await keepDeclaredModels(page, ["image"])
})

test("the Image picker opens on Z-Image Turbo, shows no release date, lab or Ran in Rosesfield under its name and no maker's line, lists no Ming row and none of the app's own words about a graph", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the desktop picker")
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/apps/image")
  const trigger = page.getByRole("button", { name: /^Model/ }).first()
  await expect(trigger).toContainText("Z-Image Turbo")
  await trigger.click()
  const list = page.getByRole("listbox")
  const rows = list.locator("[data-slot='model-row']")
  await expect(rows.first()).toBeVisible()
  const turbo = rows.filter({ hasText: "Z-Image Turbo" }).first()
  await expect(turbo.locator("[data-slot='model-row-name']")).toHaveText(
    "Z-Image Turbo"
  )
  await expect(turbo).not.toContainText("2025")
  await expect(turbo).not.toContainText("Ran in Rosesfield")
  await expect(turbo).not.toContainText("Tongyi")
  await expect(
    list.locator("[data-slot='model-row-capability']").first()
  ).toBeVisible()
  await expect(turbo).not.toContainText(
    "Photorealistic images, with text in English and Chinese"
  )
  await expect(rows.filter({ hasText: "Ming Image 0.1 Design" })).toHaveCount(0)
  await expect(list).not.toContainText("Runs 8 steps")
  await expect(list).not.toContainText("Takes up to 3 photos")
})
