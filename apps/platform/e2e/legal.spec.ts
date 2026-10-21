import { expect, type Page, test } from "@playwright/test"

const pages = [
  { path: "/privacy", heading: "Privacy" },
  { path: "/terms", heading: "Terms" },
] as const

function sidewaysOverflow(page: Page): Promise<number> {
  return page.evaluate(() =>
    Math.max(
      0,
      document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    )
  )
}

for (const legal of pages) {
  test(`${legal.path} reads in one column with no sideways scroll`, async ({
    page,
  }) => {
    await page.goto(legal.path)
    await expect(
      page.getByRole("heading", { level: 1, name: legal.heading })
    ).toBeVisible()
    const sections = page.locator("[data-slot='legal-section']")
    expect(await sections.count()).toBeGreaterThan(3)
    const boxes = await sections.evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect()
        return { x: Math.round(box.x), right: Math.round(box.right) }
      })
    )
    const width = page.viewportSize()?.width ?? 0
    expect(new Set(boxes.map((box) => box.x)).size).toBe(1)
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(16)
      expect(box.right).toBeLessThanOrEqual(width - 16)
    }
    expect(await sidewaysOverflow(page)).toBe(0)
  })
}

test("the footer opens Privacy and Terms", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/library")
  const footer = page.locator("footer[data-slot='footer']")
  await footer.getByRole("link", { name: "Privacy" }).click()
  await expect(page).toHaveURL(/\/privacy$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "Privacy" })
  ).toBeVisible()
  await page
    .locator("footer[data-slot='footer']")
    .getByRole("link", { name: "Terms" })
    .click()
  await expect(page).toHaveURL(/\/terms$/)
  await expect(
    page.getByRole("link", { name: "LTX-2.x Community License" }).first()
  ).toHaveAttribute(
    "href",
    "https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x"
  )
})
