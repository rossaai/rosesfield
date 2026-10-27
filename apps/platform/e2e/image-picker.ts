import { expect, type Locator, type Page } from "@playwright/test"
import { settled } from "./settled"

export async function openImagePicker(page: Page): Promise<Locator> {
  const trigger = page.getByRole("button", { name: /^Model/ }).first()
  await trigger.click()
  await expect(
    page.locator("[role='listbox'] [data-slot='model-row']").first()
  ).toBeVisible()
  await settled(page.locator("[data-slot='model-picker']"))
  return trigger
}
