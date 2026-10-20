import { expect, type Locator, test } from "@playwright/test"

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("the element has no box")
  }
  return box
}

test.describe("a prompt app on a desktop", () => {
  test.skip(({ isMobile }) => isMobile, "the bar shows from 768 px")

  test("docks the prompt bar 16 px above the bottom, 880 by 124, with Generate as its 120 by 80 tile", async ({
    page,
  }) => {
    await page.goto("/apps/image")
    const bar = page.locator('[data-slot="prompt-bar"]')
    await expect(bar).toBeVisible()
    const viewport = page.viewportSize()
    if (viewport === null) {
      throw new Error("the page has no viewport")
    }
    const box = await boxOf(bar)
    expect(box.width).toBe(880)
    expect(box.height).toBe(124)
    expect(box.y + box.height).toBe(viewport.height - 16)
    expect(box.x + box.width / 2).toBe(viewport.width / 2)
    const generate = await boxOf(bar.locator('[data-slot="generate-button"]'))
    expect([generate.width, generate.height]).toEqual([120, 80])
    const row = await boxOf(bar.locator('[data-slot="composer-toolbar"]'))
    expect(row.height).toBe(32)
    expect(generate.y + generate.height).toBe(row.y + row.height)
    const tile = await boxOf(
      bar.locator('[data-slot="composer-attachments-edge"]')
    )
    expect([tile.width, tile.height]).toEqual([65, 32])
    expect(tile.x).toBe(row.x)
  })

  test("keeps the bar in place while the page scrolls", async ({ page }) => {
    await page.goto("/apps/image")
    const bar = page.locator('[data-slot="prompt-bar"]')
    const before = await boxOf(bar)
    await page.mouse.wheel(0, 600)
    expect(await boxOf(bar)).toEqual(before)
  })

  test("opens on How it works while you have no output", async ({ page }) => {
    await page.goto("/apps/image")
    const how = page.getByRole("tab", { name: "How it works" })
    await expect(how).toHaveAttribute("aria-selected", "true")
    const history = await boxOf(page.getByRole("tab", { name: "History" }))
    expect(history.height).toBe(32)
  })
})

test.describe("an app with many inputs on a desktop", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("holds a 320 px column at x 16 with Generate across its 60 px footer, the output 8 px to its right", async ({
    page,
  }) => {
    await page.goto("/apps/video")
    const column = page.locator('[data-slot="composer"]')
    await expect(column).toBeVisible()
    const box = await boxOf(column)
    expect(box.x).toBe(16)
    expect(box.width).toBe(320)
    const generate = await boxOf(
      column.locator('[data-slot="generate-button"]')
    )
    expect([generate.width, generate.height]).toEqual([286, 48])
    const footer = await boxOf(column.locator('[data-slot="composer-toolbar"]'))
    expect(footer.height).toBe(60)
    const canvas = await boxOf(
      page.getByRole("region", { name: "Your outputs" })
    )
    expect(canvas.x).toBe(box.x + box.width + 8)
  })
})

test.describe("an app on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the sheet is the phone's")

  for (const appId of ["image", "video"]) {
    test(`opens the inputs and Generate from the 66 by 44 Generate key, ${appId}`, async ({
      page,
    }) => {
      await page.goto(`/apps/${appId}`)
      const region = page.getByRole("region", { name: "Your outputs" })
      await expect(region).toBeVisible()
      await expect(page.locator('[data-slot="prompt-bar"]')).toHaveCount(0)
      await expect(page.locator('[data-slot="composer"]')).toHaveCount(0)
      const canvas = await boxOf(region)
      expect(canvas.x).toBe(16)
      const key = page.locator('[data-slot="app-bar-tabGenerate"]')
      await expect(key).toHaveAccessibleName("Generate")
      const box = await boxOf(key)
      expect([box.width, box.height]).toEqual([66, 44])
      await key.click()
      const sheet = page.getByRole("dialog")
      await expect(sheet).toBeVisible()
      await expect(sheet.locator('[data-slot="generate-button"]')).toBeVisible()
    })
  }
})
