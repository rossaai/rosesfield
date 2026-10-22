import { expect, type Locator, type Page, test } from "@playwright/test"

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("the element has no box")
  }
  return box
}

async function openExplore(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/")
  await expect(page.locator("[data-slot=app-tile-grid]")).toBeVisible()
}

test("Explore opens with one banner link over six app tiles across the page", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the banner shows from 768 px")
  await openExplore(page)
  const banner = page.locator("[data-slot=hero]")
  const box = await boxOf(banner)
  expect(Math.round(box.width)).toBe(1408)
  expect(Math.round(box.height)).toBe(400)
  expect(Math.round(box.x)).toBe(16)
  expect(await banner.evaluate((element) => element.tagName)).toBe("A")
  expect(await banner.locator("a, button").count()).toBe(0)
  await expect(banner.locator("[data-slot=hero-portrait]")).toHaveCount(2)

  const tiles = page.locator(
    "[data-slot=app-tile-grid] [data-slot=preset-tile]"
  )
  expect(await tiles.count()).toBe(6)
  const [first, second, last] = await Promise.all([
    boxOf(tiles.nth(0)),
    boxOf(tiles.nth(1)),
    boxOf(tiles.nth(5)),
  ])
  expect(Math.round(first.width)).toBe(225)
  expect(Math.round(first.height)).toBe(130)
  expect(Math.round(second.x - first.x)).toBe(237)
  expect(Math.round(last.y)).toBe(Math.round(first.y))
  expect(Math.round(last.x + last.width)).toBe(1424)
})

test("on a phone Explore drops the banner and stands the tiles in two columns", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "phone",
    "the phone layout shows under 768 px"
  )
  await openExplore(page)
  await expect(page.locator("[data-slot=hero]")).toBeHidden()
  const tiles = page.locator(
    "[data-slot=app-tile-grid] [data-slot=preset-tile]"
  )
  const [first, second] = await Promise.all([
    boxOf(tiles.nth(0)),
    boxOf(tiles.nth(1)),
  ])
  expect(Math.round(first.width)).toBe(175)
  expect(Math.round(first.height)).toBe(134)
  expect(Math.round(second.x - first.x)).toBe(183)
})

test("an app tile opens its app without reloading the page", async ({
  page,
}) => {
  await openExplore(page)
  await page.evaluate(() => {
    Object.assign(window, { exploreMark: "kept" })
  })
  const tile = page
    .locator("[data-slot=app-tile-grid] [data-slot=preset-tile]")
    .first()
  const href = await tile.getAttribute("href")
  await tile.click()
  await expect(page).toHaveURL(new RegExp(`${href ?? "/apps/"}$`))
  expect(await page.evaluate(() => Reflect.get(window, "exploreMark"))).toBe(
    "kept"
  )
})

test("Explore shows the bundled examples in a masonry with no share and no key", async ({
  page,
}, info) => {
  await openExplore(page)
  const feed = page.getByRole("region", { name: "Made with Rosesfield" })
  await expect(feed).toBeVisible()
  await expect(page.getByText("No result is here yet")).toHaveCount(0)
  const tiles = feed.locator("[data-slot=media]")
  expect(await tiles.count()).toBe(6)
  await expect(feed.locator("video")).toHaveCount(2)
  const images = feed.locator("img")
  await expect(images.first()).toHaveJSProperty("complete", true)
  expect(
    await images.first().evaluate((one: HTMLImageElement) => one.naturalWidth)
  ).toBeGreaterThan(0)
  if (info.project.name === "desktop") {
    const [first, second] = await Promise.all([
      boxOf(tiles.nth(0)),
      boxOf(tiles.nth(1)),
    ])
    expect(Math.round(first.width)).toBe(228)
    expect(Math.round(second.x - first.x)).toBe(236)
  }
})

test("the Apps page fills its width with cards of 237 px or more, and a rail of 248 px cards on a phone", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/apps")
  const cards = page.locator("[data-slot=app-cards]").first().locator("a")
  await expect(cards.first()).toBeVisible()
  const [first, second] = await Promise.all([
    boxOf(cards.nth(0)),
    boxOf(cards.nth(1)),
  ])
  if (info.project.name === "desktop") {
    const fifth = await boxOf(cards.nth(4))
    expect(Math.round(first.width)).toBeGreaterThanOrEqual(237)
    expect(Math.round(second.x - first.x - first.width)).toBe(16)
    expect(Math.round(first.x)).toBe(16)
    expect(Math.round(fifth.y)).toBe(Math.round(first.y))
    expect(Math.round(fifth.x + fifth.width)).toBe(1424)
  } else {
    expect(Math.round(first.width)).toBe(248)
    expect(Math.round(first.x)).toBe(16)
    expect(Math.round(second.x - first.x)).toBe(264)
  }
  const pageWidth = await page.evaluate(
    () => document.documentElement.scrollWidth
  )
  expect(pageWidth).toBeLessThanOrEqual(
    info.project.name === "phone" ? 390 : 1440
  )
})

test("on a phone the fanned pictures stay inside the page", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "phone", "the fan narrows under 768 px")
  await page.goto("/gallery?entry=ref-hero&state=rest")
  await expect(page.locator("[data-slot=hero-fan]").first()).toBeVisible()
  const pageWidth = await page.evaluate(
    () => document.documentElement.scrollWidth
  )
  expect(pageWidth).toBeLessThanOrEqual(390)
})
