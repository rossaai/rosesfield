import { expect, type Locator, type Page, test } from "@playwright/test"

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
  const connect = bar.getByRole("link", { name: "Connect" })
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

test("an app page shrinks the bar to 36 px and the mark to 20 px", async ({
  page,
}) => {
  test.skip(isPhone(page), "the compact bar is a desktop size")
  const bar = await open(page, "/apps/image")
  await expect.poll(async () => (await boxOf(bar)).height).toBe(36)
  const mark = bar.locator("[data-slot='app-bar-mark']").first()
  await expect.poll(async () => (await boxOf(mark)).width).toBe(20)
  const connect = await boxOf(bar.getByRole("link", { name: "Connect" }))
  expect(connect.x + connect.width).toBe(1440 - 16)
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
  await expect
    .poll(() => style(image, "background-color"))
    .not.toBe(rest)
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
  }
  for (const name of ["Code on GitHub", "The challenge", "Privacy", "Terms"]) {
    await expect(footer.getByRole("link", { name })).toBeVisible()
  }
  await page.goto("/apps/image")
  await expect(page.locator("header[data-slot='app-bar']")).toBeVisible()
  expect(await page.locator("footer[data-slot='footer']").count()).toBe(0)
})
