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

test("Explore opens with one banner link over app tiles in three columns", async ({
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

  const tiles = page.locator(
    "[data-slot=app-tile-grid] [data-slot=preset-tile]"
  )
  expect(await tiles.count()).toBe(6)
  const [first, second, fourth] = await Promise.all([
    boxOf(tiles.nth(0)),
    boxOf(tiles.nth(1)),
    boxOf(tiles.nth(3)),
  ])
  expect(Math.round(first.width)).toBe(241)
  expect(Math.round(first.height)).toBe(130)
  expect(Math.round(second.x - first.x)).toBe(253)
  expect(Math.round(fourth.y - first.y)).toBe(142)
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

test("Explore with no result says so and offers the next step", async ({
  page,
}) => {
  await openExplore(page)
  await expect(page.getByText("No result is here yet")).toBeVisible()
  await expect(page.locator("[data-slot=media-feed]")).toHaveCount(0)
})

test("the Apps page stands 237 px cards 16 px apart, and a rail of 248 px cards on a phone", async ({
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
    expect(Math.round(first.width)).toBe(237)
    expect(Math.round(second.x - first.x)).toBe(253)
    expect(Math.round(first.x)).toBeGreaterThanOrEqual(16)
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
