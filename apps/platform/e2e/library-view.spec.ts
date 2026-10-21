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

async function expectLayoutWell(cluster: Locator): Promise<void> {
  const well = cluster.getByRole("tablist", { name: "Layout" })
  const wellBox = await boxOf(well)
  expect(wellBox.height).toBe(36)
  await expect(well.getByRole("tab")).toHaveCount(2)
  await expect(well.getByRole("radio")).toHaveCount(0)
  const current = well.getByRole("tab", { name: "List" })
  await expect(current).toHaveAttribute("aria-selected", "true")
  const plate = well.locator("[data-slot='segmented-control-thumb']")
  const plateBox = await boxOf(plate)
  const currentBox = await boxOf(current)
  expect(plateBox.height).toBe(30)
  expect(Math.round(plateBox.y - currentBox.y)).toBe(1)
  expect(Math.round(plateBox.x - currentBox.x)).toBe(1)
  const pill = cluster.locator("[data-slot='view-pill']")
  const filter = cluster.getByRole("button", { name: "Filter" })
  const pillBox = await boxOf(pill)
  const filterBox = await boxOf(filter)
  expect(filterBox.height).toBe(36)
  expect(Math.round(filterBox.x - (pillBox.x + pillBox.width))).toBe(8)
}

async function openFilterGroups(
  page: Page,
  cluster: Locator
): Promise<Locator> {
  await cluster.getByRole("button", { name: "Filter" }).click()
  const popup = page.locator("[data-slot='popover-content']")
  await expect(popup).toBeVisible()
  await popup.evaluate((element) =>
    Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished)
    )
  )
  const groups = page.locator("[data-slot='setting-group']")
  await expect(groups).toHaveCount(2)
  await expect.poll(async () => (await boxOf(groups.nth(0))).height).toBe(36)
  const first = await boxOf(groups.nth(0))
  const second = await boxOf(groups.nth(1))
  expect(first.height).toBe(36)
  expect(Math.round(second.y - first.y)).toBe(44)
  await expect(
    groups.nth(0).locator("[data-slot='setting-group-count']")
  ).toHaveText(/\d+/)
  return groups
}

async function expectChoiceCard(page: Page, group: Locator): Promise<void> {
  const trigger = group.locator("[data-slot='setting-group-trigger']")
  const chevron = trigger.locator("svg").last()
  await trigger.click()
  await page.waitForTimeout(60)
  const turning = await chevron.evaluate(
    (element) => getComputedStyle(element).rotate
  )
  expect(turning).not.toBe("180deg")
  const card = group.locator("[data-slot='setting-choice']").first()
  await expect(card).toBeVisible()
  await expect(chevron).toHaveCSS("rotate", "180deg")
  await page.waitForTimeout(400)
  const cardBox = await boxOf(card)
  expect(cardBox.width).toBe(88)
  expect(cardBox.height).toBe(104)
  const picture = await boxOf(
    card.locator("[data-slot='setting-choice-picture']")
  )
  expect(picture.width).toBe(68)
  expect(Math.round(picture.y - cardBox.y)).toBe(12)
  await expect(card).toHaveAttribute("aria-pressed", "true")
  const look = (element: Element): string => {
    const style = getComputedStyle(element)
    return [style.backgroundColor, style.boxShadow, style.color].join(" | ")
  }
  await page.mouse.move(0, 0)
  const rest = await card.evaluate(look)
  await card.hover()
  const hovered = await card.evaluate(look)
  expect(hovered).toBe(rest)
}

test("the head row's cluster holds the view switch and Filter once you have runs", async ({
  page,
}) => {
  await open(page, "/history")
  const cluster = page.locator("[data-slot='canvas-cluster']")
  await expect(cluster).toBeVisible()
  expect((await boxOf(cluster)).height).toBe(36)
  await expectLayoutWell(cluster)
  const groups = await openFilterGroups(page, cluster)
  await expectChoiceCard(page, groups.nth(1))
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
  const filter = page.getByRole("button", { name: "Filter" })
  await filter.focus()
  await page.keyboard.press("Shift+Tab")
  await page.keyboard.press("Tab")
  await expect(filter).toBeFocused()
  await expect(filter).toHaveCSS("outline-offset", "2px")
})

test("the Filter popover stays inside the window and under the top bar with every group open", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the desktop window")
  await startDemoRun()
  await open(page, "/history")
  await page.getByRole("button", { name: "Filter" }).click()
  const popup = page.locator("[data-slot='popover-content']")
  await expect(popup).toBeVisible()
  for (const trigger of await popup
    .locator("[data-slot='setting-group-trigger']")
    .all()) {
    if ((await trigger.getAttribute("aria-expanded")) !== "true") {
      await trigger.click()
    }
  }
  await page.waitForTimeout(400)
  const bar = await boxOf(page.locator("header[data-slot='app-bar']"))
  const box = await boxOf(popup)
  expect(box.y).toBeGreaterThanOrEqual(bar.y + bar.height)
  expect(box.y + box.height).toBeLessThanOrEqual(900)
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
  const plate = await boxOf(
    tabs.locator("[data-slot='segmented-control-thumb']")
  )
  const cell = await boxOf(failed)
  expect(Math.round(plate.x)).toBe(Math.round(cell.x))
  expect(Math.round(plate.width)).toBe(Math.round(cell.width))
  expect(plate.height).toBe(cell.height)
})

test("in Grid, items stand at their own shape in columns of their width", async ({
  page,
}, testInfo) => {
  await open(page, "/library")
  await page.getByRole("tab", { name: "Grid" }).click()
  const column = page.locator("[data-slot='result-column']").first()
  await expect(column).toBeVisible()
  const isPhone = testInfo.project.name === "phone"
  expect((await boxOf(column)).width).toBe(isPhone ? 300 : 330)
  const item = column.locator("[data-slot='grid-item']").first()
  await expect(item).toBeVisible()
  expect((await boxOf(item)).width).toBe(isPhone ? 300 : 330)
  if (isPhone) {
    return
  }
  const tile = page.locator("[data-slot='media'][data-form='library']").first()
  await expect(tile).toBeVisible()
  const veil = tile.locator("[data-slot='media-veil']")
  await page.mouse.move(0, 0)
  await expect(veil).toHaveCSS("opacity", "0")
  await tile.hover()
  await expect(veil).not.toHaveCSS("opacity", "0")
  const tileBox = await boxOf(tile)
  const expand = tile.getByRole("button", { name: "Expand" })
  const expandBox = await boxOf(expand)
  expect(expandBox.width).toBe(32)
  const right = tileBox.x + tileBox.width - (expandBox.x + expandBox.width)
  expect(Math.round(right)).toBe(12)
  expect(Math.round(expandBox.y - tileBox.y)).toBe(12)
})

test("the search field and the tile size slider show the focus ring after Tab", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "the cluster's slider shows at 1440"
  )
  await open(page, "/library")
  const search = page.getByRole("searchbox", { name: "Search your library" })
  const slider = page.getByRole("slider", { name: "Tile size" })
  await expect(slider).toBeAttached()
  let seen = { search: false, slider: false }
  for (let step = 0; step < 40 && !(seen.search && seen.slider); step += 1) {
    await page.keyboard.press("Tab")
    if (await search.evaluate((node) => node === document.activeElement)) {
      await expect(search).toHaveCSS("outline-style", "solid")
      await expect(search).toHaveCSS("outline-offset", "2px")
      seen = { ...seen, search: true }
    }
    if (await slider.evaluate((node) => node === document.activeElement)) {
      const thumb = slider.locator("xpath=..")
      await expect(thumb).toHaveCSS("outline-style", "solid")
      await expect(thumb).toHaveCSS("outline-offset", "2px")
      seen = { ...seen, slider: true }
    }
  }
  expect(seen).toEqual({ search: true, slider: true })
})

test("a first-row tile's focus ring shows whole inside the grid's scroller on History and Library", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Tab walks the desktop grid")
  for (const path of ["/history", "/library"]) {
    await open(page, path)
    await page.getByRole("tab", { name: "Grid" }).click()
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
  const cluster = await boxOf(page.locator("[data-slot='canvas-cluster']"))
  expect(tabs.x).toBe(16)
  expect(cluster.x + cluster.width).toBe(1440 - 16)
})
