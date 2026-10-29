import { expect, type Locator, type Page, test } from "@playwright/test"

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("the element has no box")
  }
  return box
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

const fits = [
  {
    width: 800,
    shown: ["Explore", "Image", "Video", "Audio", "3D"],
    menu: [
      "MCP",
      "Agent",
      "Motion",
      "Characters",
      "Library",
      "History",
      "Settings",
    ],
  },
  {
    width: 1024,
    shown: [
      "Explore",
      "Image",
      "Video",
      "Audio",
      "3D",
      "MCP",
      "AgentFeatured",
      "MotionFeatured",
    ],
    menu: ["Characters", "Library", "History", "Settings"],
  },
  {
    width: 1280,
    shown: [
      "Explore",
      "Image",
      "Video",
      "Audio",
      "3D",
      "MCP",
      "AgentFeatured",
      "MotionFeatured",
      "Characters",
      "Library",
      "History",
      "Settings",
    ],
    menu: [],
  },
]

for (const fit of fits) {
  test(`at ${fit.width} px the bar fits whole, never scrolls sideways, and folds what does not fit into one menu`, async ({
    page,
  }) => {
    test.skip(isPhone(page), "the desktop row")
    await page.setViewportSize({ width: fit.width, height: 800 })
    const bar = await open(page, "/")
    await expect(
      bar.getByRole("button", { name: "Add your Comfy key" }).last()
    ).toBeVisible()
    const row = bar.locator("[data-slot='app-bar-overflow']")
    await expect
      .poll(() =>
        row
          .locator("[data-slot='app-bar-areas']:visible")
          .evaluateAll((links) => links.map((link) => link.textContent))
      )
      .toEqual(fit.shown)
    const {
      scroll,
      client,
      page: pageWidth,
    } = await row.evaluate((element) => ({
      scroll: element.scrollWidth,
      client: element.clientWidth,
      page: document.documentElement.scrollWidth,
    }))
    expect(scroll).toBeLessThanOrEqual(client)
    expect(pageWidth).toBe(fit.width)
    const end = await boxOf(bar.locator("[data-slot='app-bar-balance']"))
    const visible = await row
      .locator("[data-slot='app-bar-areas']:visible, [data-fold-more]:visible")
      .all()
    for (const item of visible) {
      const box = await boxOf(item)
      expect(box.x + box.width).toBeLessThanOrEqual(end.x)
    }
    const more = row.locator("[data-fold-more]")
    if (fit.menu.length === 0) {
      await expect(more).toBeHidden()
      return
    }
    await more.getByRole("button", { name: "Open the menu" }).click()
    const items = page.getByRole("menuitem")
    await expect(items).toHaveText(
      fit.menu.map((name) => new RegExp(`^${name}`))
    )
  })
}
