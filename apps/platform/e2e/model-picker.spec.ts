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

test("a click on a row that carries Open weights chooses its model", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the desktop picker")
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/apps/image")
  const trigger = page.getByRole("button", { name: /^Model/ }).first()
  await trigger.click()
  const rows = page.locator("[role='listbox'] [data-slot='model-row']", {
    has: page.locator("[data-slot='model-row-weights']"),
  })
  await expect(rows.first()).toBeVisible()
  const current = (await trigger.textContent()) ?? ""
  const names = await rows
    .getByRole("option")
    .evaluateAll((options) =>
      options.map((option) => option.getAttribute("aria-label") ?? "")
    )
  const name = names.find((one) => one !== "" && !current.includes(one))
  if (name === undefined) {
    throw new Error("no other row carries Open weights")
  }
  const row = rows
    .filter({ has: page.getByRole("option", { name, exact: true }) })
    .first()
  const option = row.getByRole("option")
  const [optionBox, nameBox, weightsBox] = await Promise.all([
    option.boundingBox(),
    row.locator("[data-slot='model-row-name']").boundingBox(),
    row
      .locator("[data-slot='model-row-weights'] [data-slot='badge']")
      .boundingBox(),
  ])
  if (optionBox === null || nameBox === null || weightsBox === null) {
    throw new Error("the row has no box")
  }
  expect(weightsBox.x - (nameBox.x + nameBox.width)).toBeCloseTo(4, 0)
  await option.click({
    position: {
      x: nameBox.x + nameBox.width / 2 - optionBox.x,
      y: nameBox.y + nameBox.height / 2 - optionBox.y,
    },
    timeout: 5000,
  })
  await expect(trigger).toContainText(name)
})

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
