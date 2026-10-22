import { expect, type Page, test } from "@playwright/test"

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(page: Page, selector: string): Promise<Box> {
  const box = await page.locator(selector).first().boundingBox()
  if (box === null) {
    throw new Error(`${selector} has no box`)
  }
  return box
}

async function openWithRun(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/apps/image")
  const feed = page.locator('[data-slot="app-stage-scroll"] article img')
  if ((await feed.count()) > 0) {
    return
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  const bar = page.locator('[data-slot="composer"][data-bar="prompt"]')
  await bar
    .getByRole("textbox", { name: "Prompt" })
    .fill("a lighthouse at dusk")
  await bar.locator('[data-slot="generate-button"]').click()
  await expect(feed.first()).toBeVisible({ timeout: 20_000 })
}

test.describe("the View control of Image's feed", () => {
  test("sits 16 px from the viewport's right edge, centred on the tabs' row, over a feed that starts under the tabs", async ({
    page,
    isMobile,
  }) => {
    const viewport = isMobile
      ? { width: 390, height: 844 }
      : { width: 1440, height: 900 }
    await openWithRun(page)
    await page.setViewportSize(viewport)
    await expect(page.locator('[data-slot="view-menu"]')).toBeVisible()
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.effect?.getComputedTiming().iterations !== Infinity
          )
          .map((animation) => animation.finished.catch(() => undefined))
      )
    )
    const view = await boxOf(page, '[data-slot="view-menu"]')
    expect(viewport.width - (view.x + view.width)).toBe(16)
    const tabs = await boxOf(page, '[data-slot="canvas-head"] [role="tab"]')
    const feed = await boxOf(page, '[data-slot="app-stage-scroll"] article')
    expect(tabs.x).toBe(16)
    expect(feed.x).toBe(tabs.x)
    const middle = (box: { y: number; height: number }): number =>
      box.y + box.height / 2
    expect(Math.abs(middle(view) - middle(tabs))).toBeLessThanOrEqual(1)
  })
})
