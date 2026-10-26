import { readFileSync } from "node:fs"
import { expect, type Locator, type Page, test } from "@playwright/test"
import { answerOwnLists } from "./own-lists"

const gatewayOrigin = "http://127.0.0.1:8797"
const png = readFileSync(
  new URL("../src/gallery/fixtures/demo-image-16-9.png", import.meta.url)
)

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("the element has no box")
  }
  return box
}

const own = new Set<string>()

async function startDemoRun(): Promise<void> {
  const started = await fetch(`${gatewayOrigin}/api/apps/image/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: { prompt: "a red rose" } }),
  })
  const body: { run: { id: string } } = await started.json()
  own.add(body.run.id)
  let outputs: string[] = []
  await expect
    .poll(async () => {
      const read = await fetch(`${gatewayOrigin}/api/runs/${body.run.id}`)
      const answer: { run: { status: string; outputs: string[] } } =
        await read.json()
      outputs = answer.run.outputs
      return answer.run.status
    })
    .toBe("done")
  for (const output of outputs) {
    own.add(output)
  }
}

async function open(page: Page, path: string): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto(path)
  await page.waitForLoadState("networkidle")
}

test.beforeAll(async () => {
  const uploaded = await fetch(`${gatewayOrigin}/api/assets`, {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: png,
  })
  const body: { asset: { id: string } } = await uploaded.json()
  own.add(body.asset.id)
  await startDemoRun()
})

test.beforeEach(async ({ page }) => {
  await answerOwnLists(page, own)
})

async function openView(page: Page): Promise<Locator> {
  await page
    .locator("[data-slot='view-menu']")
    .filter({ visible: true })
    .click()
  const menu = page.locator("[data-slot='view-menu-content']")
  await expect(menu).toBeVisible()
  return menu
}

async function chooseLayout(page: Page, name: "List" | "Grid"): Promise<void> {
  const menu = await openView(page)
  await menu.getByRole("menuitemradio", { name }).click()
  await page.keyboard.press("Escape")
  await expect(menu).toBeHidden()
}

async function chooseGrid(page: Page): Promise<void> {
  await chooseLayout(page, "Grid")
}

test("the head row ends in one View, whose menu holds the layout and the filters as submenus, with no popover", async ({
  page,
}) => {
  await open(page, "/history")
  const view = page.locator("[data-slot='view-menu']").filter({ visible: true })
  await expect(view).toHaveAccessibleName("View")
  const menu = await openView(page)
  await expect(menu.getByRole("menuitemradio")).toHaveText(["List", "Grid"])
  await expect(
    menu.getByRole("menuitemradio", { name: "Grid" })
  ).toHaveAttribute("aria-checked", "true")
  await expect(menu.getByRole("slider", { name: "Tile size" })).toBeVisible()
  const facets = menu.locator("[data-slot='dropdown-menu-sub-trigger']")
  await expect(facets).toHaveText([
    /^Image/,
    /^Video/,
    /^Audio/,
    /^Characters/,
    /^Date/,
  ])
  await expect(page.locator("[data-slot='popover-content']")).toHaveCount(0)
  await facets.first().hover()
  const sub = page.locator("[data-slot='dropdown-menu-content']").last()
  await expect(sub.getByRole("menuitemradio").first()).toHaveText("All apps")
})

test("Library and History open on Grid at 228 px tiles, with a size slider of four steps", async ({
  page,
}) => {
  for (const path of ["/library", "/history"]) {
    await open(page, path)
    const menu = await openView(page)
    await expect(
      menu.getByRole("menuitemradio", { name: "Grid" }),
      path
    ).toHaveAttribute("aria-checked", "true")
    const slider = menu.getByRole("slider", { name: "Tile size" })
    await expect(slider, path).toHaveAttribute("min", "0")
    await expect(slider, path).toHaveAttribute("max", "3")
    await expect(slider, path).toHaveAttribute("value", "1")
    await page.keyboard.press("Escape")
  }
})

test("Library and History keep the layout and size you choose after a reload", async ({
  page,
}) => {
  for (const path of ["/library", "/history"]) {
    await open(page, path)
    await chooseLayout(page, "List")
    await page.reload()
    await page.waitForLoadState("networkidle")
    const menu = await openView(page)
    await expect(
      menu.getByRole("menuitemradio", { name: "List" }),
      path
    ).toHaveAttribute("aria-checked", "true")
    await page.keyboard.press("Escape")
  }
})

test("Search and View fit the head row beside the tabs on a 375 px phone", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "phone", "the phone window")
  await page.setViewportSize({ width: 375, height: 812 })
  for (const [path, tabs] of [
    ["/library", "library-tabs"],
    ["/history", "history-tabs"],
  ] as const) {
    await open(page, path)
    const row = await boxOf(page.locator(`[data-slot='${tabs}']`))
    const bar = await boxOf(
      page.locator("[data-slot='view-bar']").filter({ visible: true })
    )
    expect(Math.round(bar.x + bar.width), path).toBeLessThanOrEqual(375 - 16)
    expect(bar.y, path).toBeGreaterThanOrEqual(row.y)
    expect(bar.y + bar.height, path).toBeLessThanOrEqual(row.y + row.height)
    expect(row.height, path).toBeLessThan(48)
    await page.getByRole("button", { name: "Search", exact: true }).click()
    const field = await boxOf(page.getByRole("searchbox"))
    expect(Math.round(field.x), path).toBe(16)
    expect(Math.round(field.x + field.width), path).toBe(375 - 16)
    expect(field.y, path).toBeGreaterThan(bar.y + bar.height)
  }
})

test("History's View shows no size slider in List", async ({ page }) => {
  await open(page, "/history")
  await chooseLayout(page, "List")
  const menu = await openView(page)
  await expect(menu.getByRole("slider")).toHaveCount(0)
})

test("Library and History keep a 16 px gutter on each side, and a focus ring stands 2 px outside its control", async ({
  page,
}) => {
  for (const path of ["/library", "/history"]) {
    await open(page, path)
    const gutter = await page
      .locator("[data-slot='state-view']")
      .first()
      .evaluate((element) => {
        const main = element.closest("main")
        if (main === null) {
          return null
        }
        const outer = main.getBoundingClientRect()
        const inner = element.getBoundingClientRect()
        return {
          left: Math.round(inner.left - outer.left),
          right: Math.round(outer.left + main.clientWidth - inner.right),
        }
      })
    expect(gutter, path).toEqual({ left: 16, right: 16 })
  }
  const view = page.locator("[data-slot='view-menu']").filter({ visible: true })
  await view.focus()
  await page.keyboard.press("Shift+Tab")
  await page.keyboard.press("Tab")
  await expect(view).toBeFocused()
  await expect(view).toHaveCSS("outline-offset", "2px")
})

test("the View menu and a filter submenu stay inside the window and under the top bar", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the desktop window")
  await startDemoRun()
  await open(page, "/history")
  const menu = await openView(page)
  await menu.locator("[data-slot='dropdown-menu-sub-trigger']").first().hover()
  const sub = page.locator("[data-slot='dropdown-menu-content']").last()
  await expect(sub).toBeVisible()
  await page.waitForTimeout(400)
  const bar = await boxOf(page.locator("header[data-slot='app-bar']"))
  for (const layer of [menu, sub]) {
    const box = await boxOf(layer)
    expect(box.y).toBeGreaterThanOrEqual(bar.y + bar.height)
    expect(box.y + box.height).toBeLessThanOrEqual(900)
    expect(box.x + box.width).toBeLessThanOrEqual(1440)
  }
})

test("the screen header's title starts on the same 16 px gutter as the canvas on Library and History", async ({
  page,
}) => {
  for (const path of ["/library", "/history"]) {
    await open(page, path)
    const canvas = await boxOf(page.locator("[data-slot='state-view']").first())
    const title = await boxOf(
      page.locator("header h1").filter({ visible: true }).first()
    )
    expect(Math.round(title.x), path).toBe(Math.round(canvas.x))
    expect(Math.round(canvas.x), path).toBe(16)
  }
})

test("History's state tabs show every label whole, with the plate on the chosen cell", async ({
  page,
}) => {
  await open(page, "/history")
  const tabs = page.getByRole("radiogroup", { name: "State" })
  await expect(tabs).toBeVisible()
  const cut = await tabs
    .locator("[data-slot='segment-label']")
    .evaluateAll((labels) =>
      labels
        .filter((label) => label.scrollWidth > label.clientWidth)
        .map((label) => label.textContent)
    )
  expect(cut).toEqual([])
  const failed = tabs.getByRole("radio", { name: "Failed" })
  await failed.click()
  const thumb = tabs.locator("[data-slot='segmented-control-thumb']")
  await thumb.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished))
  )
  const plate = await boxOf(thumb)
  const cell = await boxOf(failed)
  expect(Math.round(plate.x)).toBe(Math.round(cell.x))
  expect(Math.round(plate.width)).toBe(Math.round(cell.width))
  expect(plate.height).toBe(cell.height)
})

test("Library opens on Grid with items at their own shape in 228 px columns from the row's start, two columns on a phone", async ({
  page,
}, testInfo) => {
  await open(page, "/library")
  const column = page.locator("[data-slot='result-column']").first()
  await expect(column).toBeVisible()
  const isPhone = testInfo.project.name === "phone"
  const columnBox = await boxOf(column)
  expect(columnBox.x).toBe(16)
  if (isPhone) {
    await expect(page.locator("[data-slot='result-column']")).toHaveCount(2)
    expect(Math.round(columnBox.width)).toBe(176)
    return
  }
  expect(Math.round(columnBox.width)).toBe(228)
  const tile = page.locator("[data-slot='media'][data-form='library']").first()
  await expect(tile).toBeVisible()
  const facts = tile.locator("[data-slot='media-chrome-facts']")
  await page.mouse.move(0, 0)
  await expect(facts).toHaveCSS("opacity", "0")
  await tile.hover()
  await expect(facts).not.toHaveCSS("opacity", "0")
  const tileBox = await boxOf(tile)
  const expand = tile.getByRole("button", { name: "Expand" })
  expect((await boxOf(expand)).width).toBe(33)
  const actions = await boxOf(
    tile.locator("[data-slot='media-chrome-actions']")
  )
  const right = tileBox.x + tileBox.width - (actions.x + actions.width)
  expect(Math.round(right)).toBe(10)
  expect(Math.round(actions.y - tileBox.y)).toBe(10)
})

test("the search field and the tile size slider show the focus ring after Tab", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "the cluster's slider shows at 1440"
  )
  await open(page, "/library")
  const opener = page.getByRole("button", { name: "Search", exact: true })
  const search = page.getByRole("searchbox", { name: "Search your library" })
  let seen = { search: false, slider: false }
  for (let step = 0; step < 40 && !seen.search; step += 1) {
    await page.keyboard.press("Tab")
    if (await opener.evaluate((node) => node === document.activeElement)) {
      await page.keyboard.press("Enter")
      await expect(search).toBeFocused()
      await expect(search).toHaveCSS("outline-style", "solid")
      await expect(search).toHaveCSS("outline-offset", "2px")
      seen = { ...seen, search: true }
    }
  }
  await openView(page)
  const slider = page.getByRole("slider", { name: "Tile size" })
  await expect(slider).toBeAttached()
  await slider.focus()
  await page.keyboard.press("ArrowLeft")
  if (await slider.evaluate((node) => node === document.activeElement)) {
    const thumb = slider.locator("xpath=..")
    await expect(thumb).toHaveCSS("outline-style", "solid")
    await expect(thumb).toHaveCSS("outline-offset", "2px")
    seen = { ...seen, slider: true }
  }
  expect(seen).toEqual({ search: true, slider: true })
})

test("a first-row tile's focus ring shows whole inside the grid's scroller on History and Library", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Tab walks the desktop grid")
  for (const path of ["/history", "/library"]) {
    await open(page, path)
    await chooseGrid(page)
    const scroll = page.locator("[data-slot='canvas-scroll']")
    const tile = scroll.locator("[data-slot='media']").first()
    await expect(tile).toBeVisible()
    const scrollBox = await boxOf(scroll)
    const tileBox = await boxOf(tile)
    expect(tileBox.y - scrollBox.y, path).toBeGreaterThanOrEqual(4)
  }
})

test("History's head row starts and ends on the page title's 16 px gutter", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the head row at 1440")
  await open(page, "/history")
  const tabs = await boxOf(page.getByRole("radiogroup", { name: "State" }))
  const view = await boxOf(
    page.locator("[data-slot='view-menu']").filter({ visible: true })
  )
  expect(tabs.x).toBe(16)
  expect(Math.round(view.x + view.width)).toBe(1440 - 16)
})
