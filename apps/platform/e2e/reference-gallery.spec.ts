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

async function open(page: Page, entry: string, state = "rest"): Promise<void> {
  await page.goto(`/gallery?entry=${entry}&state=${state}`)
  await expect(page.locator(".px-4.py-6").first()).toBeVisible()
}

test("a hero button is 48 px tall with 16 px padding, and a pair sits 8 px apart", async ({
  page,
}) => {
  await open(page, "ref-button")
  const start = page.getByRole("button", { name: "Start" }).first()
  const learn = page.getByRole("button", { name: "Learn more" })
  const first = await boxOf(start)
  const second = await boxOf(learn)
  expect(first.height).toBe(48)
  expect(await style(start, "padding-left")).toBe("16px")
  expect(await style(start, "white-space")).toBe("nowrap")
  expect(second.x - (first.x + first.width)).toBe(8)
})

test("Recreate is 32 px tall with a 16 px glyph, and 28 px when small", async ({
  page,
}) => {
  await open(page, "ref-button")
  const [large, small] = await page
    .getByRole("button", { name: "Recreate" })
    .all()
  if (large === undefined || small === undefined) {
    throw new Error("the gallery shows two Recreate buttons")
  }
  expect((await boxOf(large)).height).toBe(32)
  expect((await boxOf(small)).height).toBe(28)
  expect((await boxOf(large.locator("svg"))).width).toBe(16)
})

test("hover and press change light and never size", async ({ page }) => {
  await open(page, "ref-button")
  const start = page.getByRole("button", { name: "Start" }).first()
  const rest = await boxOf(start)
  await start.hover()
  await page.mouse.down()
  expect(await boxOf(start)).toEqual(rest)
  expect(await style(start, "transform")).toBe("none")
  await page.mouse.up()
})

test("the glyph buttons stand 24, 36, 38, 28, 32, 40 and 60 px by role", async ({
  page,
}) => {
  await open(page, "ref-icon-button")
  const sizes = await page
    .locator("[data-place]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().height)
    )
  expect(sizes).toEqual([24, 36, 38, 28, 32, 40, 60, 40])
})

test("a mode strip holds 36 px tabs 12 px apart, the current one underlined 2 px", async ({
  page,
}) => {
  await open(page, "ref-tabs")
  const create = page.getByRole("tab", { name: "Create video" })
  const edit = page.getByRole("tab", { name: "Edit video" })
  const one = await boxOf(create)
  const two = await boxOf(edit)
  expect(one.height).toBe(36)
  expect(two.x - (one.x + one.width)).toBe(12)
  expect(await style(create, "border-bottom-width")).toBe("2px")
  await edit.click()
  await expect(edit).toHaveAttribute("aria-selected", "true")
})

test("a segmented control holds 32 px cells 4 px apart over a plate that jumps", async ({
  page,
}) => {
  await open(page, "ref-tabs")
  const history = page.getByRole("tab", { name: "History" })
  const how = page.getByRole("tab", { name: "How it works" })
  const one = await boxOf(history)
  const two = await boxOf(how)
  expect(one.height).toBe(32)
  expect(two.x - (one.x + one.width)).toBe(4)
  await history.click()
  const plate = page.locator("[data-slot='segmented-control-thumb']").first()
  expect(Math.round((await boxOf(plate)).x)).toBe(Math.round(one.x))
})

test("a filter chip is 32 px tall and the chips wrap or scroll by width", async ({
  page,
}, info) => {
  await open(page, "ref-filter-chips")
  const chip = page.getByRole("link", { name: "Melt" })
  expect((await boxOf(chip)).height).toBe(32)
  const line = page.getByRole("navigation", { name: "Presets" }).locator(":scope > div")
  if (info.project.name === "phone") {
    expect((await boxOf(line)).height).toBe(48)
    expect(await style(line, "overflow-x")).toBe("auto")
  } else {
    expect(await style(line, "flex-wrap")).toBe("wrap")
    expect(await style(line, "justify-content")).toBe("center")
  }
})

test("a setting group closes to 36 px at a 44 px pitch and shows its count", async ({
  page,
}) => {
  await open(page, "ref-filter-chips")
  const groups = page.locator("[data-slot='setting-group']")
  const first = await boxOf(groups.nth(0))
  const second = await boxOf(groups.nth(1))
  expect(first.height).toBe(36)
  expect(second.y - first.y).toBe(44)
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
