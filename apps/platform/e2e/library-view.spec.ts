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
  const well = cluster.locator("[data-slot='view-well']")
  expect((await boxOf(well)).height).toBe(36)
  await expect(well.getByRole("radio")).toHaveCount(2)
  const pill = cluster.locator("[data-slot='view-pill']")
  const filter = cluster.getByRole("button", { name: "Filter" })
  const pillBox = await boxOf(pill)
  const filterBox = await boxOf(filter)
  expect(filterBox.height).toBe(36)
  expect(Math.round(filterBox.x - (pillBox.x + pillBox.width))).toBe(8)

  await filter.click()
  const groups = page.locator("[data-slot='setting-group']")
  await expect(groups).toHaveCount(2)
  const first = await boxOf(groups.nth(0))
  const second = await boxOf(groups.nth(1))
  expect(first.height).toBe(36)
  expect(Math.round(second.y - first.y)).toBe(44)
  await expect(
    groups.nth(0).locator("[data-slot='setting-group-count']")
  ).toHaveText(/\d+/)
})

test("in Grid, items stand at their own shape in columns of their width", async ({
  page,
}, testInfo) => {
  await open(page, "/library")
  await page.getByRole("radio", { name: "Grid" }).click()
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
