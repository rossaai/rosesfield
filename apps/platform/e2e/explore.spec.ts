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

test("Explore opens with one banner link over one apps row of 228 px cards that steps sideways", async ({
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
  const tiles = apps.locator("[data-slot=app-card]")
  expect(await tiles.count()).toBeGreaterThanOrEqual(3)
  const [first, second] = await Promise.all([
    boxOf(tiles.nth(0)),
    boxOf(tiles.nth(1)),
  ])
  expect(Math.round(first.width)).toBe(228)
  expect(Math.round(second.x - first.x)).toBe(235)
  await expect(apps.locator("[data-slot=media-feed-next]")).toBeVisible()
  await expect(page.getByText("Open Edit", { exact: true })).toHaveCount(1)
  expect(await banner.getAttribute("href")).toBe("/apps/edit")
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
  const first = await boxOf(apps.locator("[data-slot=app-card]").first())
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
  const tile = apps.locator("[data-slot=app-card]").first()
  const href = await tile.getAttribute("href")
  await tile.dispatchEvent("click")
  await expect(page).toHaveURL(new RegExp(`${href ?? "/apps/"}$`))
  expect(await page.evaluate(() => Reflect.get(window, "exploreMark"))).toBe(
    "kept"
  )
})

test("Explore shows every held still and clip once in a masonry packed into the shortest stack, the after of a pair without its source, with no share and no key, each clip looping muted", async ({
  page,
}, info) => {
  await openExplore(page)
  const feed = page.getByRole("region", { name: "Made with Rosesfield" })
  await expect(feed).toBeVisible()
  await expect(page.getByText("No result is here yet")).toHaveCount(0)
  const tiles = feed.locator("[data-slot=media]")
  expect(await tiles.count()).toBe(21)
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

test("at 1440 by 900 Explore opens at the second size, its examples in 228 px columns, and a size change resizes them and is kept", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the step widths hold from 768 px")
  const apps = await openExplore(page)
  const feed = page.getByRole("region", { name: "Made with Rosesfield" })
  await expect(feed).toBeVisible()
  const columnWidths = () =>
    feed
      .locator("[data-slot=media-feed-stack]")
      .evaluateAll((all) => all.map((one) => one.getBoundingClientRect().width))
  const widths = await columnWidths()
  expect(widths).toHaveLength(6)
  for (const width of widths) {
    expect(width).toBeGreaterThanOrEqual(228)
    expect(width).toBeLessThanOrEqual(228 + 7)
  }
  await expect(page.locator("[data-slot=explore-head]")).toBeVisible()
  await page.getByRole("button", { name: "View", exact: true }).click()
  await expect(page.getByRole("menuitemradio")).toHaveCount(0)
  const slider = page.getByRole("slider")
  await slider.focus()
  await page.keyboard.press("End")
  await page.keyboard.press("Escape")
  await expect
    .poll(async () =>
      Math.round(
        (await boxOf(apps.locator("[data-slot=app-card]").first())).width
      )
    )
    .toBe(464)
  const wide = await columnWidths()
  expect(wide).toHaveLength(3)
  for (const width of wide) {
    expect(width).toBeGreaterThanOrEqual(464)
    expect(width).toBeLessThanOrEqual(464 + 7)
  }
  await page.reload()
  await expect
    .poll(async () =>
      Math.round(
        (
          await boxOf(
            page
              .getByRole("region", { name: "Apps", exact: true })
              .locator("[data-slot=app-card]")
              .first()
          )
        ).width
      )
    )
    .toBe(464)
})

test("Search on Explore keeps the matching apps and examples, hides an empty section and shows the no-match state", async ({
  page,
}) => {
  await openExplore(page)
  await page.getByRole("button", { name: "Search" }).click()
  const field = page.getByRole("searchbox", {
    name: "Search apps and examples",
  })
  await expect(field).toBeFocused()
  const feed = page.getByRole("region", { name: "Made with Rosesfield" })
  const all = await feed.locator("[data-slot=media]").count()
  await field.fill("portrait woman")
  await expect(
    page.getByRole("region", { name: "Apps", exact: true })
  ).toHaveCount(0)
  await expect
    .poll(() => feed.locator("[data-slot=media]").count())
    .toBeLessThan(all)
  expect(await feed.locator("[data-slot=media]").count()).toBeGreaterThan(0)
  await expect(field).toBeFocused()
  await field.fill("zebra quasar")
  await expect(page.getByText("Nothing here matches")).toBeVisible()
  await expect(feed).toHaveCount(0)
  await page.getByRole("button", { name: "Show everything" }).click()
  await expect(
    page.getByRole("region", { name: "Apps", exact: true })
  ).toBeVisible()
})

test("on a phone Explore's View stands as its icon and Search opens on its own line", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "phone",
    "the phone layout shows under 768 px"
  )
  await openExplore(page)
  const head = page.locator("[data-slot=explore-head]")
  const view = head.getByRole("button", { name: "View" })
  await expect(view).toBeVisible()
  expect((await view.innerText()).trim()).toBe("")
  await head.getByRole("button", { name: "Search" }).click()
  const field = page.getByRole("searchbox", {
    name: "Search apps and examples",
  })
  await expect(field).toBeVisible()
  const [fieldBox, viewBox, headBox] = await Promise.all([
    boxOf(field),
    boxOf(view),
    boxOf(head),
  ])
  expect(fieldBox.y).toBeGreaterThanOrEqual(viewBox.y + viewBox.height)
  expect(Math.round(fieldBox.width)).toBe(Math.round(headBox.width))
  const pageWidth = await page.evaluate(
    () => document.documentElement.scrollWidth
  )
  expect(pageWidth).toBeLessThanOrEqual(390)
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
