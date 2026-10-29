import { expect, type Locator, type Page, test } from "@playwright/test"
import { answerOwnLists } from "./own-lists"

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("the element has no box")
  }
  return box
}

async function style(locator: Locator, property: string): Promise<string> {
  return locator.evaluate(
    (element, name) => getComputedStyle(element).getPropertyValue(name),
    property
  )
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

test("the top bar spans the viewport at the header height, 53 px, with no sidebar", async ({
  page,
}) => {
  const bar = await open(page, "/")
  const width = page.viewportSize()?.width ?? 0
  expect(await boxOf(bar)).toEqual({ x: 0, y: 0, width, height: 53 })
  expect(await style(bar, "position")).toBe("sticky")
  expect(await style(bar, "padding-left")).toBe("16px")
  expect(await page.locator("[data-slot='sidebar']").count()).toBe(0)
})

test("on a desktop the mark, the area links and the balance sit in one row, with no Connect", async ({
  page,
}) => {
  test.skip(isPhone(page), "the desktop row")
  const bar = await open(page, "/")
  const mark = bar.locator("[data-slot='app-bar-mark']").first()
  expect(await boxOf(mark)).toEqual({ x: 16, y: 14.5, width: 36, height: 24 })
  await expect(bar.getByRole("button", { name: "Connect" })).toHaveCount(0)
  const end = await boxOf(bar.locator("[data-slot='app-bar-balance']"))
  expect(end.x + end.width).toBe(1440 - 16)
  const links = await bar.locator("[data-slot='app-bar-areas']").all()
  const boxes = await Promise.all(links.map(boxOf))
  expect(boxes.every((box) => box.height === 26 && box.y === 13.5)).toBe(true)
  const explore = boxes[0]
  const image = boxes[1]
  if (explore === undefined || image === undefined) {
    throw new Error("the bar lists Explore and Image")
  }
  expect(image.x).toBe(explore.x + explore.width)
  const separators = bar.locator("[data-slot='nav-separator']")
  await expect(separators).toHaveCount(2)
  const [before, after] = await Promise.all([
    boxOf(separators.nth(0)),
    boxOf(separators.nth(1)),
  ])
  for (const separator of [before, after]) {
    expect({ width: separator.width, height: separator.height }).toEqual({
      width: 1,
      height: 12,
    })
  }
  const agent = await boxOf(
    bar.getByRole("link", { name: "Agent", exact: true })
  )
  const characters = await boxOf(
    bar.getByRole("link", { name: "Characters", exact: true })
  )
  const last = boxes.at(-1)
  if (last === undefined) {
    throw new Error("the bar lists its links")
  }
  const mcp = await boxOf(bar.getByRole("button", { name: "MCP", exact: true }))
  expect(mcp.x).toBe(
    (boxes[4]?.x ?? Number.POSITIVE_INFINITY) + (boxes[4]?.width ?? 0)
  )
  expect(before.x).toBeGreaterThan(mcp.x)
  expect(agent.x).toBeGreaterThan(before.x)
  expect(after.x).toBeGreaterThan(agent.x + agent.width)
  expect(characters.x).toBeGreaterThan(after.x)
  expect(last.x).toBeGreaterThan(characters.x)
})

test("the area links start 13 px after the mark, at the list's start", async ({
  page,
}) => {
  test.skip(isPhone(page), "the desktop row")
  const bar = await open(page, "/")
  const mark = await boxOf(bar.locator("[data-slot='app-bar-mark']").first())
  const explore = await boxOf(
    bar.locator("[data-slot='app-bar-areas']").first()
  )
  expect(explore.x).toBe(mark.x + mark.width + 13)
})

test("a focused control draws its ring 2 px outside its edge, unclipped", async ({
  page,
}) => {
  test.skip(isPhone(page), "the desktop row")
  const bar = await open(page, "/")
  const explore = bar.locator("[data-slot='app-bar-areas']").first()
  await explore.focus()
  await page.keyboard.press("Shift+Tab")
  await page.keyboard.press("Tab")
  await expect(explore).toBeFocused()
  expect(await style(explore, "outline-offset")).toBe("2px")
  expect(await style(explore, "outline-width")).toBe("2px")
  const clip = await boxOf(bar.locator("[data-slot='app-bar-overflow']"))
  const link = await boxOf(explore)
  expect(link.x - 4).toBeGreaterThanOrEqual(clip.x)
  expect(link.y - 4).toBeGreaterThanOrEqual(clip.y)
  expect(link.y + link.height + 4).toBeLessThanOrEqual(clip.y + clip.height)
})

test("on a short page the footer sits at the window's foot", async ({
  page,
}) => {
  test.skip(isPhone(page), "a page shorter than the desktop window")
  await open(page, "/apps?q=no-app-matches-this")
  const footer = page.locator("footer[data-slot='footer']")
  await expect(footer).toBeVisible()
  const main = await boxOf(page.locator("main"))
  const box = await boxOf(footer)
  expect(box.y + box.height).toBe(main.y + main.height)
})

test("a product page ends with no footer", async ({ page }) => {
  await answerOwnLists(page, new Set())
  for (const path of ["/history", "/library", "/characters"]) {
    await open(page, path)
    await expect(page.locator("main h1").first()).toBeAttached()
    expect(await page.locator("footer[data-slot='footer']").count(), path).toBe(
      0
    )
  }
})

test("an app page shrinks the bar to 30 px and the mark to 24 px on the yield preset", async ({
  page,
}) => {
  test.skip(isPhone(page), "the compact bar is a desktop size")
  const bar = await open(page, "/apps/image")
  await expect.poll(async () => (await boxOf(bar)).height).toBe(30)
  const mark = bar.locator("[data-slot='app-bar-mark']").first()
  await expect.poll(async () => (await boxOf(mark)).width).toBe(24)
  const balance = bar.locator("[data-slot='app-bar-balance'] button:visible")
  await expect.poll(async () => (await boxOf(balance)).height).toBe(26)
  const end = await boxOf(balance)
  expect(end.x + end.width).toBe(1440 - 16)
  expect(await style(balance, "padding-left")).toBe("10px")
  const row = bar.locator("[data-slot='app-bar-row']")
  expect(await style(row, "transition-property")).toContain("height")
  expect(await style(mark, "transition-property")).toContain("width")
})

test("the balance holds a 16 px icon 3 px before its label, the button's gap, on every page", async ({
  page,
}) => {
  test.skip(isPhone(page), "the balance label is a desktop size")
  await page.route("**/api/settings", async (route) => {
    const response = await route.fetch()
    const body: { settings: Record<string, unknown> } = await response.json()
    await route.fulfill({
      response,
      json: { settings: { ...body.settings, keyFrom: "server" } },
    })
  })
  const gap = 3
  for (const path of ["/", "/apps/image"]) {
    const bar = await open(page, path)
    const balance = bar.locator(
      "[data-slot='app-bar-balance'] [data-slot='button']"
    )
    await expect(balance).toBeVisible()
    await expect.poll(() => style(balance, "gap")).toBe(`${gap}px`)
    const icon = await boxOf(balance.locator("svg"))
    const label = await boxOf(balance.locator("[data-slot='button-label']"))
    expect({ width: icon.width, height: icon.height }).toEqual({
      width: 16,
      height: 16,
    })
    expect(Math.round(label.x - (icon.x + icon.width))).toBe(gap)
  }
})

test("a link at rest brightens its text on hover", async ({ page }) => {
  test.skip(isPhone(page), "the area links are a desktop row")
  const bar = await open(page, "/")
  const library = bar.getByRole("link", { name: "Library" })
  const explore = bar.getByRole("link", { name: "Explore" })
  const ink = await style(explore, "color")
  expect(await style(library, "color")).not.toBe(ink)
  await library.hover()
  await expect.poll(() => style(library, "color")).toBe(ink)
})

test("an Image link opens a menu of its apps and reads as hovered", async ({
  page,
}) => {
  test.skip(isPhone(page), "the area links are a desktop row")
  const bar = await open(page, "/")
  const image = bar.getByRole("button", { name: "Image" })
  const rest = await style(image, "background-color")
  await image.click()
  const menu = page.locator("[data-slot='app-bar-areaMenu']")
  await expect(menu).toBeVisible()
  await expect(menu.getByRole("menuitem").first()).toBeVisible()
  await page.mouse.move(1400, 700)
  await expect.poll(() => style(image, "background-color")).not.toBe(rest)
})

test("on a phone the bar holds the wordmark, a menu and no area link", async ({
  page,
}) => {
  test.skip(!isPhone(page), "the phone bar")
  const bar = await open(page, "/")
  await expect(bar.locator("[data-slot='app-bar-areas']").first()).toBeHidden()
  const separators = bar.locator("[data-slot='nav-separator']")
  await expect(separators).toHaveCount(2)
  await expect(separators.nth(0)).toBeHidden()
  await expect(separators.nth(1)).toBeHidden()
  const lockup = bar.locator("[data-slot='app-bar-mark']").nth(1)
  const box = await boxOf(lockup)
  expect({ x: box.x, y: box.y, height: box.height }).toEqual({
    x: 16,
    y: 10.5,
    height: 32,
  })
  await bar.getByRole("button", { name: "Open the menu" }).click()
  await expect(page.getByRole("menuitem", { name: "Library" })).toBeVisible()
})

test("on a phone the bottom bar holds five places at the header height with Generate centred, on the regular material", async ({
  page,
}) => {
  test.skip(!isPhone(page), "the phone bar")
  await open(page, "/")
  const tabs = page.getByRole("navigation", { name: "Main" })
  const bar = await boxOf(tabs)
  const height = page.viewportSize()?.height ?? 0
  const row = await boxOf(tabs.locator("[data-slot='app-bar-tabs']"))
  expect(row.height).toBe(53)
  expect(bar.height).toBe(53 + 2 * 3)
  expect(bar.y + bar.height).toBe(height)
  const generate = await boxOf(tabs.getByRole("button", { name: "Generate" }))
  expect({ width: generate.width, height: generate.height }).toEqual({
    width: 66,
    height: 40,
  })
  expect(generate.x + generate.width / 2).toBeCloseTo(195, 0)
  await expect(tabs.locator("[data-slot='app-bar-glow']")).toHaveCount(0)
  expect(await style(tabs, "backdrop-filter")).toContain("blur(16px)")
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390
  )
  const library = tabs.getByRole("link", { name: "Library" })
  await library.click()
  await expect(library).toHaveAttribute("aria-current", "page")
})

test("the footer closes Explore with its links and leaves an app page", async ({
  page,
}) => {
  await open(page, "/")
  const footer = page.locator("footer[data-slot='footer']")
  await footer.scrollIntoViewIfNeeded()
  const field = footer.locator(":scope > div").first()
  const padding = isPhone(page) ? "20px" : "40px"
  expect(await style(field, "padding-top")).toBe(padding)
  if (!isPhone(page)) {
    const tracks = async (locator: Locator): Promise<number[]> =>
      (await style(locator, "grid-template-columns"))
        .split(" ")
        .map((track) => Number.parseFloat(track))
    const spread = (widths: number[]): number =>
      Math.max(...widths) - Math.min(...widths)
    const thirds = await tracks(footer.locator("h2").locator(".."))
    expect(thirds).toHaveLength(3)
    expect(spread(thirds)).toBeLessThan(0.1)
    const columns = await tracks(
      footer.locator("section").first().locator("..")
    )
    expect(columns).toHaveLength(2)
    expect(spread(columns)).toBeLessThan(0.1)
  }
  expect(await footer.locator(":scope > div").count()).toBe(1)
  expect(await footer.locator("p").count()).toBe(0)
  if (isPhone(page)) {
    const groups = await footer.locator("section").all()
    const columns = await Promise.all(groups.map(boxOf))
    expect(columns.map((column) => [column.x, column.width])).toEqual([
      [16, 169],
      [205, 169],
    ])
  }
  const legal = footer.locator("section").filter({ hasText: "Legal" })
  await expect(legal.getByRole("link", { name: "Trademarks" })).toBeVisible()
  for (const name of ["Code on GitHub", "The challenge", "Privacy", "Terms"]) {
    await expect(footer.getByRole("link", { name })).toBeVisible()
  }
  await page.goto("/apps/image")
  await expect(page.locator("header[data-slot='app-bar']")).toBeVisible()
  expect(await page.locator("footer[data-slot='footer']").count()).toBe(0)
})

test("on a phone the area menu sits 4 px before the balance", async ({
  page,
}) => {
  test.skip(!isPhone(page), "the phone bar")
  for (const path of ["/", "/library", "/history"]) {
    const bar = await open(page, path)
    const menu = await boxOf(bar.getByRole("button", { name: "Open the menu" }))
    const balance = await boxOf(bar.locator("[data-slot='app-bar-balance']"))
    expect(Math.round(balance.x - (menu.x + menu.width)), path).toBe(4)
  }
})

test("MCP opens its dialog over the page, and /connect opens it over Explore", async ({
  page,
}) => {
  await answerOwnLists(page, new Set())
  await open(page, "/history")
  const connect = isPhone(page)
    ? page.getByRole("navigation", { name: "Main" }).getByRole("button", {
        name: "MCP",
      })
    : page.locator("header[data-slot='app-bar']").getByRole("button", {
        name: "MCP",
      })
  await connect.click()
  const dialog = page.getByRole("dialog")
  await expect(
    dialog.getByRole("heading", { name: "Add your Comfy key" })
  ).toBeVisible()
  await expect(dialog.getByRole("radio")).toHaveCount(0)
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible()
  expect(new URL(page.url()).pathname).toBe("/history")
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(dialog).toBeHidden()
  await page.goto("/connect?client=api")
  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
})
