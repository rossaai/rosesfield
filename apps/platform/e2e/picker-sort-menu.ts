import { expect, type Locator, type Page } from "@playwright/test"

async function pointAt(page: Page, row: Locator, share: number): Promise<void> {
  const box = await row.boundingBox()
  if (box === null) {
    throw new Error("the menu row has no box")
  }
  await page.mouse.move(box.x + box.width * share, box.y + box.height / 2, {
    steps: 8,
  })
}

async function expectOneLeadInset(rows: readonly Locator[]): Promise<void> {
  const boxes = await Promise.all(
    rows.map((row) =>
      row.locator("[data-slot='dropdown-menu-lead']").boundingBox()
    )
  )
  for (const box of boxes) {
    expect(box?.width).toBeGreaterThan(0)
    expect(box?.x).toBe(boxes[0]?.x)
    expect(box?.width).toBe(boxes[0]?.width)
  }
}

async function expectSubmenu(
  page: Page,
  names: readonly string[],
  checked: string
): Promise<void> {
  const sub = page.locator("[data-slot='dropdown-menu-content']").last()
  await expect(sub.getByRole("menuitemradio")).toHaveText([...names])
  await expect(
    sub.getByRole("menuitemradio", { name: checked })
  ).toHaveAttribute("aria-checked", "true")
}

export async function expectSortMenu(page: Page): Promise<Locator> {
  const menu = page.locator("[data-slot='view-menu-content']").first()
  const sorts = menu.locator("[data-slot='dropdown-menu-sub-trigger']")
  await expect(sorts).toHaveText(["Sort byRank", "OrderHigh to low"])
  const open = menu.getByRole("menuitemcheckbox", { name: "Open weights only" })
  await expectOneLeadInset([sorts.nth(0), sorts.nth(1), open])
  await sorts.nth(0).hover()
  await expectSubmenu(page, ["Rank", "Price"], "Rank")
  await pointAt(page, sorts.nth(1), 0.5)
  await expect(sorts.nth(1)).toHaveAttribute("aria-expanded", "true")
  await expectSubmenu(page, ["High to low", "Low to high"], "High to low")
  await pointAt(page, open, 0.25)
  await expect(sorts.nth(1)).toHaveAttribute("aria-expanded", "false")
  return open
}
