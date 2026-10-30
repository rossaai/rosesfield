import { expect, type Locator, type Page, test } from "@playwright/test"

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("the element has no box")
  }
  return box
}

async function open(page: Page, path: string): Promise<Locator> {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto(path)
  const bar = page.locator("header[data-slot='app-bar']")
  await expect(bar).toBeVisible()
  return bar
}

function isPhone(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 768
}

const everyLink = [
  "Explore",
  "Image",
  "Video",
  "Audio",
  "3D",
  "MCP",
  "AgentFeatured",
  "MotionFeatured",
  "AI InfluencerFeatured",
  "Characters",
  "Library",
  "History",
  "Settings",
]

for (const width of [800, 1024, 1440]) {
  test(`at ${width} px the bar holds every link in one row that scrolls sideways, with no menu`, async ({
    page,
  }) => {
    test.skip(isPhone(page), "the desktop row")
    await page.setViewportSize({ width, height: 800 })
    const bar = await open(page, "/")
    const row = bar.locator("[data-slot='app-bar-overflow']")
    await expect(row).toBeVisible()
    await expect(row.locator("[data-slot='app-bar-areas']")).toHaveText(
      everyLink.map((name) => new RegExp(`^${name}$`))
    )
    await expect(row.locator("[hidden]")).toHaveCount(0)
    await expect(
      bar.getByRole("button", { name: "Open the menu" })
    ).toBeHidden()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBe(width)
    const end = await boxOf(bar.locator("[data-slot='app-bar-balance']"))
    const clip = await boxOf(row)
    expect(clip.x + clip.width).toBeLessThanOrEqual(end.x)
    const fits = await row.evaluate(
      (element) => element.scrollWidth <= element.clientWidth
    )
    if (fits) {
      return
    }
    await row.hover()
    await page.mouse.wheel(0, 4000)
    await expect
      .poll(() =>
        row.evaluate(
          (element) =>
            element.scrollLeft + element.clientWidth >= element.scrollWidth - 1
        )
      )
      .toBe(true)
    const settings = await boxOf(
      row.locator("[data-slot='app-bar-areas']").last()
    )
    expect(settings.x + settings.width).toBeLessThanOrEqual(clip.x + clip.width)
  })
}
