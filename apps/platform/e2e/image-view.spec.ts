import { expect, type Page, test } from "@playwright/test"
import { answerOwnLists } from "./own-lists"

const gatewayOrigin = "http://127.0.0.1:8797"

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
  const feed = page.locator('[data-slot="app-stage-scroll"] img')
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
  test("sits 16 px from the viewport's right edge, centred on the tabs' row, after a head row that starts with the app's title, over a feed that starts under the title", async ({
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
    const feed = await boxOf(
      page,
      '[data-slot="app-stage-scroll"] [data-slot="result-column"]'
    )
    if (isMobile) {
      expect(tabs.x).toBe(16)
      expect(feed.x).toBe(tabs.x)
    } else {
      const title = await boxOf(page, '[data-slot="canvas-head"] h1')
      await expect(page.locator('[data-slot="canvas-head"] h1')).toHaveText(
        "Image"
      )
      expect(title.x).toBe(16)
      expect(feed.x).toBe(title.x)
      expect(tabs.x).toBeGreaterThan(title.x + title.width)
    }
    const middle = (box: { y: number; height: number }): number =>
      box.y + box.height / 2
    expect(Math.abs(middle(view) - middle(tabs))).toBeLessThanOrEqual(1)
  })
})

async function startDone(
  appId: string,
  body: Record<string, unknown>
): Promise<string> {
  const started = await fetch(`${gatewayOrigin}/api/apps/${appId}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  expect(started.ok).toBe(true)
  const made: { run: { id: string } } = await started.json()
  await expect
    .poll(
      async () => {
        const read = await fetch(`${gatewayOrigin}/api/runs/${made.run.id}`)
        const answer: { run: { status: string } } = await read.json()
        return answer.run.status
      },
      { timeout: 30_000 }
    )
    .toBe("done")
  return made.run.id
}

async function columnsOn(page: Page, path: string): Promise<number> {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto(path)
  const columns = page.locator(
    '[data-slot="app-stage-scroll"] [data-slot="result-column"]'
  )
  await expect(columns.first()).toBeVisible({ timeout: 20_000 })
  await expect(
    page.locator('[data-slot="app-stage-scroll"] [data-slot="result-grid"]')
  ).toBeVisible()
  return columns.count()
}

test.describe("an app page's Grid at 1440 by 900", () => {
  test.skip(({ isMobile }) => isMobile, "the column counts of a wide window")

  test("opens Image on Grid at 228 px tiles, six columns under the bar", async ({
    page,
  }) => {
    const own = new Set<string>()
    for (const prompt of ["a lighthouse at dusk", "a red rose"]) {
      own.add(await startDone("image", { inputs: { prompt }, count: 4 }))
    }
    await answerOwnLists(page, own)
    await page.setViewportSize({ width: 1440, height: 900 })
    expect(await columnsOn(page, "/apps/image")).toBe(6)
  })

  test("opens Video on Grid at 228 px tiles, four columns beside the column", async ({
    page,
  }) => {
    const own = new Set<string>()
    for (const prompt of [
      "a paper boat",
      "a red kite",
      "a tin robot",
      "a slow river",
      "a green field",
    ]) {
      own.add(
        await startDone("video", { inputs: { model: "ltx-2-5", prompt } })
      )
    }
    await answerOwnLists(page, own)
    await page.setViewportSize({ width: 1440, height: 900 })
    expect(await columnsOn(page, "/apps/video")).toBe(4)
  })
})
