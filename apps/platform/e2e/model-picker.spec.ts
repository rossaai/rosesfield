import { expect, type Locator, type Page, test } from "@playwright/test"

const shortScreen = { width: 390, height: 480 }

async function boxOf(
  locator: Locator
): Promise<{ top: number; bottom: number }> {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("the element has no box")
  }
  return { top: box.y, bottom: box.y + box.height }
}

async function openPicker(page: Page, state: string): Promise<void> {
  await page.setViewportSize(shortScreen)
  await page.goto(`/gallery?entry=model-picker&state=${state}`)
  await expect(page.getByRole("searchbox").first()).toBeVisible()
}

for (const state of ["open", "with-settings"]) {
  test(`keeps the search in view while the list scrolls on a short screen, ${state}`, async ({
    page,
  }) => {
    await openPicker(page, state)
    const search = page.getByRole("searchbox").first()
    const list = page.getByRole("listbox").first()
    const picker = page.locator('[data-slot="model-picker"]').first()
    const before = await boxOf(search)
    expect(before.top).toBeGreaterThanOrEqual(0)
    expect(before.bottom - before.top).toBeGreaterThan(0)
    expect((await boxOf(picker)).bottom).toBeLessThanOrEqual(shortScreen.height)
    const scroller = list.locator("xpath=..")
    const sizes = await scroller.evaluate((element) => ({
      scroll: element.scrollHeight,
      client: element.clientHeight,
    }))
    expect(sizes.scroll).toBeGreaterThan(sizes.client)
    await scroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    expect(
      await scroller.evaluate((element) => element.scrollTop)
    ).toBeGreaterThan(0)
    const after = await boxOf(search)
    expect(after).toEqual(before)
    expect(after.bottom).toBeLessThanOrEqual(shortScreen.height)
  })
}
