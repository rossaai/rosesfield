import { expect, type Locator, type Page } from "@playwright/test"

export async function expectTip(
  page: Page,
  well: Locator,
  words: string | RegExp
): Promise<void> {
  await well.hover()
  await expect(page.locator('[data-slot="tooltip-content"]')).toContainText(
    words
  )
  await page.mouse.move(0, 0)
  await expect(page.locator('[data-slot="tooltip-content"]')).toHaveCount(0)
}
