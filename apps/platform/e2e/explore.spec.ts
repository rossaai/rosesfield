import { expect, type Locator, type Page, test } from "@playwright/test"

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("the element has no box")
  }
  return box
}

async function openExplore(page: Page): Promise<Locator> {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/")
  const apps = page.getByRole("region", { name: "Apps", exact: true })
  await expect(apps).toBeVisible()
  return apps
}

test("Explore opens with one banner link over one apps row that steps sideways", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the banner shows from 768 px")
  const apps = await openExplore(page)
  const banner = page.locator("[data-slot=hero]")
  const box = await boxOf(banner)
  expect(Math.round(box.width)).toBe(1408)
  expect(Math.round(box.x)).toBe(16)
  expect(await banner.evaluate((element) => element.tagName)).toBe("A")
  expect(await banner.locator("a, button").count()).toBe(0)
  await expect(banner.locator("[data-slot=hero-portrait]")).toHaveCount(2)
  await expect(banner.locator("[data-slot=hero-tag]")).toHaveCount(0)
  await expect(page.locator("[data-slot=app-tile-grid]")).toHaveCount(0)
  const tiles = apps.locator("[data-slot=explore-app]")
  expect(await tiles.count()).toBeGreaterThanOrEqual(3)
  const [first, second] = await Promise.all([
    boxOf(tiles.nth(0)),
    boxOf(tiles.nth(1)),
  ])
  expect(Math.round(first.width)).toBe(408)
  expect(Math.round(second.x - first.x)).toBe(415)
  await expect(apps.locator("[data-slot=media-feed-next]")).toBeVisible()
  await expect(page.getByText("Open Image", { exact: true })).toHaveCount(1)
})

test("on a phone Explore shows the banner as a compact card without its portraits, over the one apps row", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "phone",
    "the phone layout shows under 768 px"
  )
  const apps = await openExplore(page)
  const banner = page.locator("[data-slot=hero]")
  await expect(banner).toBeVisible()
  await expect(banner).toContainText("Make images and video on your own key")
  for (const portrait of await banner
    .locator("[data-slot=hero-portrait]")
    .all()) {
    await expect(portrait).toBeHidden()
  }
  const first = await boxOf(apps.locator("[data-slot=explore-app]").first())
  expect(Math.round(first.x)).toBe(16)
  const pageWidth = await page.evaluate(
    () => document.documentElement.scrollWidth
  )
  expect(pageWidth).toBeLessThanOrEqual(390)
})

test("an app in the row opens its app without reloading the page", async ({
  page,
}) => {
  const apps = await openExplore(page)
  await page.evaluate(() => {
    Object.assign(window, { exploreMark: "kept" })
  })
  const tile = apps.locator("[data-slot=explore-app]").first()
  const href = await tile.getAttribute("href")
  await tile.click()
  await expect(page).toHaveURL(new RegExp(`${href ?? "/apps/"}$`))
  expect(await page.evaluate(() => Reflect.get(window, "exploreMark"))).toBe(
    "kept"
  )
})

test("Explore shows every held still and clip once in a masonry packed into the shortest stack, with no share and no key, each clip looping muted", async ({
  page,
}, info) => {
  await openExplore(page)
  const feed = page.getByRole("region", { name: "Made with Rosesfield" })
  await expect(feed).toBeVisible()
  await expect(page.getByText("No result is here yet")).toHaveCount(0)
  const tiles = feed.locator("[data-slot=media]")
  expect(await tiles.count()).toBe(20)
  const clips = feed.locator("video")
  await expect(clips).toHaveCount(2)
  for (const clip of await clips.all()) {
    await expect(clip).toHaveJSProperty("muted", true)
    await expect(clip).toHaveJSProperty("loop", true)
  }
  const sources = await feed
    .locator("img, video")
    .evaluateAll((media) => media.map((one) => one.getAttribute("src")))
  expect(new Set(sources).size).toBe(sources.length)
  const images = feed.locator("img")
  await expect(images.first()).toHaveJSProperty("complete", true)
  expect(
    await images.first().evaluate((one: HTMLImageElement) => one.naturalWidth)
  ).toBeGreaterThan(0)
  if (info.project.name === "desktop") {
    const stacks = await feed
      .locator("[data-slot=media-feed-stack]")
      .evaluateAll((all) =>
        all.map((stack) => {
          const last = stack.lastElementChild?.getBoundingClientRect()
          return { top: last?.top ?? 0, bottom: last?.bottom ?? 0 }
        })
      )
    const lowestEnd = Math.min(...stacks.map((stack) => stack.bottom))
    for (const stack of stacks) {
      expect(stack.top).toBeLessThanOrEqual(lowestEnd + 8)
    }
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
  const [first, second] = await page
    .locator("[data-slot=app-cards]")
    .first()
    .evaluate((grid) =>
      [...grid.querySelectorAll(":scope > a")].slice(0, 2).map((card) => {
        const { x, y, width, height } = card.getBoundingClientRect()
        return { x, y, width, height }
      })
    )
  if (first === undefined || second === undefined) {
    throw new Error("the Apps page lists two cards")
  }
  if (info.project.name === "desktop") {
    expect(Math.round(first.width)).toBeGreaterThanOrEqual(237)
    expect(Math.round(second.x - first.x - first.width)).toBe(16)
    expect(Math.round(first.x)).toBe(16)
    const columns = await page
      .locator("[data-slot=app-cards]")
      .first()
      .evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(" "))
    expect(columns).toHaveLength(5)
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
