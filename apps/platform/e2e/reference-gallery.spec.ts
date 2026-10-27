import { expect, type Locator, type Page, test } from "@playwright/test"
import { settled } from "./settled"

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

async function open(page: Page, entry: string, state = "rest"): Promise<void> {
  await page.goto(`/gallery?entry=${entry}&state=${state}`)
  await expect(page.locator(".px-4.py-6").first()).toBeVisible()
}

function frame(page: Page): Locator {
  return page.locator(".px-4.py-6").first()
}

test("a chrome button stands at control.btn, 40 px, with 16 px sides, and a pair sits 8 px apart", async ({
  page,
}) => {
  await open(page, "ref-button")
  const start = page.getByRole("button", { name: "Start" }).first()
  const learn = page.getByRole("button", { name: "Learn more" })
  const first = await boxOf(start)
  const second = await boxOf(learn)
  expect(first.height).toBe(40)
  expect(await style(start, "padding-left")).toBe("16px")
  expect(await style(start, "white-space")).toBe("nowrap")
  expect(second.x - (first.x + first.width)).toBe(8)
})

test("Recreate stands 26 px at the row density and 33 px at the composer density, with a 16 px glyph", async ({
  page,
}) => {
  await open(page, "ref-button")
  const [row, composer] = await page
    .getByRole("button", { name: "Recreate" })
    .all()
  if (row === undefined || composer === undefined) {
    throw new Error("the gallery shows two Recreate buttons")
  }
  expect((await boxOf(row)).height).toBe(26)
  expect((await boxOf(composer)).height).toBe(33)
  expect((await boxOf(row.locator("svg"))).width).toBe(16)
  expect(await style(row, "padding-left")).toBe("13px")
})

test("hover changes light and never size, and a press scales the button by the press preset", async ({
  page,
}) => {
  await open(page, "ref-button")
  const start = page.getByRole("button", { name: "Start" }).first()
  const rest = await boxOf(start)
  await start.hover()
  expect(await boxOf(start)).toEqual(rest)
  await page.mouse.down()
  await expect
    .poll(() => style(start, "transform"))
    .toBe("matrix(0.96, 0, 0, 0.96, 0, 0)")
  await page.mouse.up()
  await expect.poll(() => style(start, "transform")).toBe("none")
  await settled(start)
  expect(await boxOf(start)).toEqual(rest)
})

test("the glyph buttons stand 36, 33, 26 and 23 px by size, on every tone", async ({
  page,
}) => {
  await open(page, "ref-icon-button")
  const sizes = await frame(page)
    .getByRole("button")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect()
        return [box.width, box.height]
      })
    )
  expect(sizes).toEqual([
    [36, 36],
    [33, 33],
    [26, 26],
    [23, 23],
    [36, 36],
    [33, 33],
  ])
})

test("a segmented control's track stands 40 px in chrome and 26 px in the composer and a row, its cells 2 px in and 3 px apart under a thumb on the travel preset", async ({
  page,
}) => {
  await open(page, "ref-tabs")
  const controls = frame(page).locator("[data-slot='segmented-control']")
  for (const [at, track] of [
    [0, 40],
    [1, 26],
    [2, 26],
  ] as const) {
    const control = controls.nth(at)
    const box = await boxOf(control)
    expect(box.height).toBe(track)
    const cells = control.locator("[data-slot='segmented-control-cells']")
    const one = await boxOf(cells.nth(0))
    const two = await boxOf(cells.nth(1))
    expect(one.height).toBe(track - 4)
    expect(one.x - box.x).toBe(2)
    expect(Math.round(two.x - (one.x + one.width))).toBe(3)
  }
  const thumb = controls
    .first()
    .locator("[data-slot='segmented-control-thumb']")
  expect(await style(thumb, "transition-property")).toContain("translate")
  const create = controls.first().getByRole("radio", { name: "Create" })
  await expect(create).toBeChecked()
  const plate = await boxOf(thumb)
  const cell = await boxOf(create)
  expect(Math.abs(plate.x - cell.x)).toBeLessThan(0.5)
  expect(Math.abs(plate.width - cell.width)).toBeLessThan(0.5)
})

test("the tabs stand 30 px, 3 px apart, over one plate that travels to the current tab", async ({
  page,
}) => {
  await open(page, "ref-tabs")
  const history = page.getByRole("tab", { name: "History" })
  const how = page.getByRole("tab", { name: "How it works" })
  const one = await boxOf(history)
  const two = await boxOf(how)
  expect(one.height).toBe(30)
  expect(Math.round(two.x - (one.x + one.width))).toBe(3)
  const plate = page.locator("[data-slot='tabs-indicator']").first()
  expect(await style(plate, "transition-property")).toContain("translate")
  await history.click()
  await expect(history).toHaveAttribute("aria-selected", "true")
  await settled(plate)
  expect(Math.round((await boxOf(plate)).x)).toBe(Math.round(one.x))
})

test("a filter chip is 33 px tall and the chips wrap or scroll by width", async ({
  page,
}, info) => {
  await open(page, "ref-filter-chips")
  const chip = page.getByRole("link", { name: "Melt" })
  expect((await boxOf(chip)).height).toBe(33)
  const line = page
    .getByRole("navigation", { name: "Presets" })
    .locator(":scope > div")
  if (info.project.name === "phone") {
    expect((await boxOf(line)).height).toBe(48)
    expect(await style(line, "overflow-x")).toBe("auto")
  } else {
    expect(await style(line, "flex-wrap")).toBe("wrap")
    expect(await style(line, "justify-content")).toBe("center")
  }
})

test("a setting group closes to its 26 px trigger inside 4 px, at a 42 px pitch, and shows its count", async ({
  page,
}) => {
  await open(page, "ref-filter-chips")
  const groups = page.locator("[data-slot='setting-group']")
  const first = await boxOf(groups.nth(0))
  const second = await boxOf(groups.nth(1))
  const trigger = await boxOf(
    groups.nth(0).locator("[data-slot='setting-group-trigger']")
  )
  expect(trigger.height).toBe(26)
  expect(first.height).toBe(26 + 2 * 4)
  expect(second.y - first.y).toBe(42)
  await expect(groups.nth(0)).toContainText("· 12")
})

test("a badge is 16 px tall, 4 px after the label it rides on", async ({
  page,
}) => {
  await open(page, "ref-badge")
  const badge = page.locator("[data-slot='badge'][data-kind='new']")
  expect((await boxOf(badge)).height).toBe(16)
  expect(await style(badge, "margin-inline-start")).toBe("4px")
})
