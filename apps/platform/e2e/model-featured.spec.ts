import { expect, type Page, test } from "@playwright/test"
import { openImagePicker } from "./image-picker"

async function idsIn(page: Page, section: string): Promise<string[]> {
  return page
    .locator(
      `[role='listbox'] [data-section='${section}'] [role='option']:visible`
    )
    .evaluateAll((rows) =>
      rows.map((row) => row.getAttribute("data-model") ?? "")
    )
}

async function sortBy(page: Page, row: number, option: string): Promise<void> {
  const menu = page.locator("[data-slot='view-menu-content']").first()
  if (!(await menu.isVisible())) {
    await page.getByRole("button", { name: "Sort and filter" }).click()
  }
  await menu.locator("[data-slot='dropdown-menu-sub-trigger']").nth(row).hover()
  await page.getByRole("menuitemradio", { name: option }).click()
}

test("the Image picker shows Featured, the #1 and then the Best value models in rank order, above All models, and keeps that order on a price sort", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the desktop picker")
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/apps/image")
  await openImagePicker(page)
  const listbox = page.locator("[role='listbox']")
  await expect(listbox.locator("[data-slot='model-list-label']")).toHaveText([
    "Featured",
    "All models",
  ])
  await expect(listbox).not.toContainText("Recent")
  await expect(listbox.locator("[data-slot='model-list-section']")).toHaveCount(
    2
  )
  const featured = await idsIn(page, "featured")
  expect(featured.length).toBeGreaterThan(0)
  expect(featured.length).toBeLessThanOrEqual(3)
  expect(new Set(featured).size).toBe(featured.length)
  const rows = listbox.locator(
    "[data-section='featured'] [data-slot='model-row']"
  )
  await expect(rows.first().locator("[data-slot='model-row-rank']")).toHaveText(
    "1"
  )
  for (const row of (await rows.all()).slice(1)) {
    await expect(row.locator("[data-kind='value']")).toHaveCount(1)
  }
  const ranked = await idsIn(page, "all")
  expect(featured.map((id) => ranked.indexOf(id))).toEqual(
    featured.map((id) => ranked.indexOf(id)).toSorted((a, b) => a - b)
  )
  await sortBy(page, 0, "Price")
  await sortBy(page, 1, "Low to high")
  await page.keyboard.press("Escape")
  await expect.poll(() => idsIn(page, "all")).not.toEqual(ranked)
  expect(await idsIn(page, "featured")).toEqual(featured)
})
