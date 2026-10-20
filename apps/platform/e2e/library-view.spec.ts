import { readFileSync } from "node:fs"
import { expect, type Locator, type Page, test } from "@playwright/test"

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

async function startDemoRun(): Promise<void> {
  const started = await fetch(`${gatewayOrigin}/api/apps/image/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: { prompt: "a red rose" } }),
  })
  const body: { run: { id: string } } = await started.json()
  await expect
    .poll(async () => {
      const read = await fetch(`${gatewayOrigin}/api/runs/${body.run.id}`)
      const answer: { run: { status: string } } = await read.json()
      return answer.run.status
    })
    .toBe("done")
}

async function open(page: Page, path: string): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto(path)
  await page.waitForLoadState("networkidle")
}

test.beforeAll(async () => {
  await fetch(`${gatewayOrigin}/api/assets`, {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: png,
  })
  await startDemoRun()
})

test("the head row's cluster holds the view switch and Filter once you have runs", async ({
  page,
}) => {
  await open(page, "/history")
  const cluster = page.locator("[data-slot='canvas-cluster']")
  await expect(cluster).toBeVisible()
  expect((await boxOf(cluster)).height).toBe(36)
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

  await filter.click()
  const popup = page.locator("[data-slot='popover-content']")
  await expect(popup).toBeVisible()
  await popup.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished))
  )
  const groups = page.locator("[data-slot='setting-group']")
  await expect(groups).toHaveCount(2)
  const first = await boxOf(groups.nth(0))
  const second = await boxOf(groups.nth(1))
  expect(first.height).toBe(36)
  expect(Math.round(second.y - first.y)).toBe(44)
  await expect(
    groups.nth(0).locator("[data-slot='setting-group-count']")
  ).toHaveText(/\d+/)

  const trigger = groups.nth(1).locator("[data-slot='setting-group-trigger']")
  const chevron = trigger.locator("svg").last()
  await trigger.click()
  await page.waitForTimeout(60)
  const turning = await chevron.evaluate(
    (element) => getComputedStyle(element).rotate
  )
  expect(turning).not.toBe("180deg")
  const card = groups.nth(1).locator("[data-slot='setting-choice']").first()
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
})

test("Library and History keep a 16 px gutter on each side, and a focus ring sits inside its control", async ({
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
  await expect(filter).toHaveCSS("outline-offset", "-2px")
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
