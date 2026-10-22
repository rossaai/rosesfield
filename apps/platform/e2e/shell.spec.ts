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

test("the top bar spans the viewport, 52 px tall, with no sidebar", async ({
  page,
}) => {
  const bar = await open(page, "/")
  const width = page.viewportSize()?.width ?? 0
  expect(await boxOf(bar)).toEqual({ x: 0, y: 0, width, height: 52 })
  expect(await style(bar, "position")).toBe("sticky")
  expect(await style(bar, "padding-left")).toBe("16px")
  expect(await page.locator("[data-slot='sidebar']").count()).toBe(0)
})

test("on a desktop the mark, the area links and Connect sit in one row", async ({
  page,
}) => {
  test.skip(isPhone(page), "the desktop row")
  const bar = await open(page, "/")
  const mark = bar.locator("[data-slot='app-bar-mark']").first()
  expect(await boxOf(mark)).toEqual({ x: 16, y: 10, width: 32, height: 32 })
  const connect = bar.getByRole("button", { name: "Connect" })
  const end = await boxOf(connect)
  expect(end.x + end.width).toBe(1440 - 16)
  const links = await bar.locator("[data-slot='app-bar-areas']").all()
  const boxes = await Promise.all(links.map(boxOf))
  expect(boxes.every((box) => box.height === 28 && box.y === 12)).toBe(true)
  const explore = boxes[0]
  const image = boxes[1]
  if (explore === undefined || image === undefined) {
    throw new Error("the bar lists Explore and Image")
  }
  expect(image.x).toBe(explore.x + explore.width)
  const separator = await boxOf(bar.locator("[data-slot='nav-separator']"))
  expect({ width: separator.width, height: separator.height }).toEqual({
    width: 1,
    height: 12,
  })
})

test("the area links start 12 px after the mark, at the list's start", async ({
  page,
}) => {
  test.skip(isPhone(page), "the desktop row")
  const bar = await open(page, "/")
  const mark = await boxOf(bar.locator("[data-slot='app-bar-mark']").first())
  const explore = await boxOf(
    bar.locator("[data-slot='app-bar-areas']").first()
  )
  expect(explore.x).toBe(mark.x + mark.width + 12)
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
  await answerOwnLists(page, new Set())
  await open(page, "/history")
  await expect(page.getByText("Your runs show here")).toBeVisible()
  const footer = page.locator("footer[data-slot='footer']")
  await expect(footer).toBeVisible()
  const main = await boxOf(page.locator("main"))
  const box = await boxOf(footer)
  expect(box.y + box.height).toBe(main.y + main.height)
})

test("an app page shrinks the bar to 36 px and the mark to 20 px", async ({
  page,
}) => {
  test.skip(isPhone(page), "the compact bar is a desktop size")
  const bar = await open(page, "/apps/image")
  await expect.poll(async () => (await boxOf(bar)).height).toBe(36)
  const mark = bar.locator("[data-slot='app-bar-mark']").first()
  await expect.poll(async () => (await boxOf(mark)).width).toBe(20)
  const connect = bar.getByRole("button", { name: "Connect" })
  await expect.poll(async () => (await boxOf(connect)).height).toBe(24)
  const end = await boxOf(connect)
  expect(end.x + end.width).toBe(1440 - 16)
  expect(await style(connect, "padding-left")).toBe("10px")
  expect(await style(connect, "transition-property")).toContain("height")
  expect(await style(connect, "transition-property")).toContain("padding")
})

test("the balance holds a 16 px icon 8 px before its label, 6 px on an app page", async ({
  page,
}) => {
  test.skip(isPhone(page), "the compact gap is a desktop size")
  for (const [path, gap] of [
    ["/", 8],
    ["/apps/image", 6],
  ] as const) {
    const bar = await open(page, path)
    const balance = bar.locator("[data-slot='app-bar-balance'] > *")
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
  await expect(bar.locator("[data-slot='nav-separator']")).toBeHidden()
  const lockup = bar.locator("[data-slot='app-bar-mark']").nth(1)
  const box = await boxOf(lockup)
  expect({ x: box.x, y: box.y, height: box.height }).toEqual({
    x: 16,
    y: 10,
    height: 32,
  })
  await bar.getByRole("button", { name: "Open the menu" }).click()
  await expect(page.getByRole("menuitem", { name: "Library" })).toBeVisible()
})

test("on a phone the bottom bar holds five places with Generate centred", async ({
  page,
}) => {
  test.skip(!isPhone(page), "the phone bar")
  await open(page, "/")
  const tabs = page.getByRole("navigation", { name: "Main" })
  const bar = await boxOf(tabs)
  const height = page.viewportSize()?.height ?? 0
  expect(bar.height).toBe(57)
  expect(bar.y + bar.height).toBe(height)
  const generate = await boxOf(tabs.getByRole("button", { name: "Generate" }))
  expect({ width: generate.width, height: generate.height }).toEqual({
    width: 66,
    height: 44,
  })
  expect(generate.x + generate.width / 2).toBeCloseTo(195, 0)
  const glow = await boxOf(tabs.locator("[data-slot='app-bar-glow']"))
  expect({ y: glow.y, width: glow.width }).toEqual({
    y: bar.y - 35,
    width: 390,
  })
  expect(await style(tabs, "background-color")).toBe("rgba(0, 0, 0, 0)")
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
  const padding = isPhone(page) ? "16px" : "36px"
  expect(await style(field, "padding-top")).toBe(padding)
  if (!isPhone(page)) {
    expect((await boxOf(footer.locator("h2"))).width).toBe(384)
    const grid = footer.locator("section").first().locator("..")
    const columns = (await style(grid, "grid-template-columns")).split(" ")
    expect(columns).toHaveLength(5)
    expect(new Set(columns).size).toBe(1)
  }
  expect(await footer.locator(":scope > div").count()).toBe(1)
  expect(await footer.locator("p").count()).toBe(0)
  if (isPhone(page)) {
    const groups = await footer.locator("section").all()
    const columns = await Promise.all(groups.map(boxOf))
    expect(columns.map((column) => [column.x, column.width])).toEqual([
      [16, 142],
      [206, 142],
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

test("Connect opens a dialog over the page, and /connect opens it over Explore", async ({
  page,
}) => {
  await answerOwnLists(page, new Set())
  await open(page, "/history")
  const connect = isPhone(page)
    ? page.getByRole("navigation", { name: "Main" }).getByRole("button", {
        name: "Connect",
      })
    : page.locator("header[data-slot='app-bar']").getByRole("button", {
        name: "Connect",
      })
  await connect.click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("heading", { name: "Connect" })).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible()
  expect(new URL(page.url()).pathname).toBe("/history")
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(dialog).toBeHidden()
  await page.goto("/connect?client=api")
  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
})
