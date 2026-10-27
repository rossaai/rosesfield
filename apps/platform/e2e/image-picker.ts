import { expect, type Locator, type Page } from "@playwright/test"

export async function openImagePicker(page: Page): Promise<Locator> {
  const trigger = page.getByRole("button", { name: /^Model/ }).first()
  await trigger.click()
  await expect(
    page.locator("[role='listbox'] [data-slot='model-row']").first()
  ).toBeVisible()
  await page
    .locator("[data-slot='model-picker']")
    .evaluate((element) =>
      Promise.all(
        element.getAnimations().map((animation) => animation.finished)
      )
    )
  return trigger
}
