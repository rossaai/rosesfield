import { expect, type Locator, type Page, test } from "@playwright/test"

const wide = 16 / 9

async function openImage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/apps/image")
}

async function ratiosOf(locator: Locator): Promise<number[]> {
  const boxes = await Promise.all(
    (await locator.all()).map((one) => one.boundingBox())
  )
  return boxes.map((box) =>
    box === null || box.height === 0 ? 0 : box.width / box.height
  )
}

test.describe("a run of 4 on Image", () => {
  test.skip(({ isMobile }) => isMobile, "the bar shows its chips from 768 px")

  test("shows four tiles in your format at once, then four images in it", async ({
    page,
  }) => {
    await openImage(page)
    const bar = page.locator('[data-slot="prompt-bar"]')
    await bar
      .getByRole("textbox", { name: "Prompt" })
      .fill("a paper boat on a still pond")
    await bar.getByRole("combobox", { name: /Format/ }).click()
    await page.getByRole("option", { name: "16:9" }).click()
    const more = bar.getByRole("button", { name: "One more" })
    for (const _ of [1, 2, 3]) {
      await more.click()
    }
    await expect(bar.getByRole("group", { name: "Count" })).toHaveText("4/4")
    await bar.locator('[data-slot="generate-button"]').click()
    const run = page.locator('[data-slot="app-stage-scroll"] article').last()
    const tiles = run.locator('[data-slot="working-pulse"]')
    await expect(tiles).toHaveCount(4)
    for (const ratio of await ratiosOf(tiles)) {
      expect(Math.abs(ratio - wide) / wide).toBeLessThan(0.02)
    }
    const images = run.locator("img")
    await expect(images).toHaveCount(4, { timeout: 20_000 })
    await expect(tiles).toHaveCount(0)
    for (const ratio of await ratiosOf(images)) {
      expect(Math.abs(ratio - wide) / wide).toBeLessThan(0.02)
    }
  })
})
