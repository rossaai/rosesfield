import { expect, type Locator, test } from "@playwright/test"

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("the element has no box")
  }
  return box
}

const modelRow =
  '[data-slot="popover-trigger"]:has([data-slot="model-row-name"])'

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

test.describe("the prompt bar's field and model chip", () => {
  test.skip(({ isMobile }) => isMobile, "the bar shows from 768 px")

  test("grows the prompt with its text over the control timing, up to a fifth of the viewport", async ({
    page,
  }) => {
    await page.goto("/apps/image")
    const field = page.getByRole("textbox", { name: "Prompt" })
    await expect(field).toBeVisible()
    const rest = await boxOf(field)
    await field.fill(["one", "two", "three", "four", "five", "six"].join("\n"))
    const early = await boxOf(field)
    await expect
      .poll(async () => (await boxOf(field)).height)
      .toBeGreaterThan(early.height)
    await page.waitForTimeout(500)
    const grown = await boxOf(field)
    expect(rest.height).toBe(40)
    expect(grown.height).toBeLessThanOrEqual(180)
    expect(grown.height).toBeGreaterThan(rest.height)
  })

  test("hugs the model chip around its name, the name plus 66 px", async ({
    page,
  }) => {
    await page.goto("/apps/image")
    const chip = page
      .locator('[data-slot="prompt-bar"]')
      .locator(modelRow)
      .first()
    await expect(chip).toBeVisible()
    const name = await boxOf(chip.locator('[data-slot="model-row-name"]'))
    const box = await boxOf(chip)
    expect(Math.round(box.width - name.width)).toBe(66)
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
      page.getByRole("region", { name: "Your results" })
    )
    expect(canvas.x).toBe(box.x + box.width + 8)
    expect(box.height).toBe(780)
    expect(canvas.height).toBe(780)
  })
})

test.describe("the parts of Video's column", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("stacks 302 px parts 8 px apart: 36 px mode tabs, a 302 by 130 start frame with Change 6 px from its corner, a 126 px prompt and a 48 px model row", async ({
    page,
  }) => {
    await page.goto("/apps/video")
    const column = page.locator('[data-slot="composer"]')
    await expect(column).toBeVisible()
    const tab = await boxOf(column.getByRole("tab").first())
    expect(tab.height).toBe(36)
    const frame = column.locator('[data-slot="composer-attachments-tiles"]')
    const frameBox = await boxOf(frame)
    expect([frameBox.width, frameBox.height]).toEqual([302, 130])
    const change = await boxOf(frame.getByRole("button", { name: "Change" }))
    expect(frameBox.x + frameBox.width - (change.x + change.width)).toBe(6)
    expect(change.y - frameBox.y).toBe(6)
    const prompt = await boxOf(
      column.locator('[data-slot="composer-prompt-block"]')
    )
    expect(prompt.width).toBe(302)
    const row = await boxOf(column.locator(modelRow))
    expect([row.width, row.height]).toEqual([302, 48])
    const modes = column.locator('[data-slot="segmented-control"]')
    if ((await modes.count()) > 0) {
      const mode = await boxOf(modes)
      expect([mode.width, mode.height]).toEqual([302, 48])
      expect(mode.y).toBe(frameBox.y + frameBox.height + 8)
    }
    expect(frameBox.y).toBe(tab.y + tab.height + 8)
  })
})

test.describe("the tray and rhythm of Video's column", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("holds the mode tabs 16 px in from the tray's edge, all inside it, and leaves 16 px under the mode switch", async ({
    page,
  }) => {
    await page.goto("/apps/video")
    const column = page.locator('[data-slot="composer"]')
    await expect(column).toBeVisible()
    const tab = await boxOf(column.getByRole("tab").first())
    const modes = column.locator('[data-slot="segmented-control"]')
    const tray = await boxOf(column.locator('[data-slot="composer-tray"]'))
    expect(tab.x).toBe(tray.x + 16)
    const last = await boxOf(column.getByRole("tab").last())
    expect(last.x + last.width).toBeLessThanOrEqual(tray.x + tray.width - 16)
    if ((await modes.count()) > 0) {
      const mode = await boxOf(modes)
      const next = await boxOf(
        modes.locator("xpath=../following-sibling::*[1]")
      )
      expect(next.y).toBe(mode.y + mode.height + 16)
    }
  })

  test("opens the model list 8 px to the right of the model row", async ({
    page,
  }) => {
    await page.goto("/apps/video")
    const row = page.locator('[data-slot="composer"]').locator(modelRow)
    await row.click()
    const list = page.locator('[data-slot="model-picker"]')
    await expect(list).toBeVisible()
    const rowBox = await boxOf(row)
    await expect
      .poll(async () => (await boxOf(list)).x)
      .toBe(rowBox.x + rowBox.width + 8)
    const listBox = await boxOf(list)
    expect(listBox.width).toBe(402)
  })
})

test.describe("Video's mode switch and its settings", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("insets the chosen mode's plate 2 px inside its 147 by 40 cell, 143 by 36", async ({
    page,
  }) => {
    await page.goto("/apps/video")
    const modes = page
      .locator('[data-slot="composer"]')
      .locator('[data-slot="segmented-control"]')
    await expect(modes).toBeVisible()
    const chosen = modes.locator('[role="radio"][aria-checked="true"]')
    const cell = await boxOf(chosen)
    const plate = await boxOf(
      modes.locator('[data-slot="segmented-control-thumb"]')
    )
    expect([cell.width, cell.height]).toEqual([147, 40])
    expect([plate.width, plate.height]).toEqual([143, 36])
    expect(plate.x - cell.x).toBe(2)
    expect(plate.y - cell.y).toBe(2)
  })

  test("turns the More settings chevron over the control timing instead of jumping", async ({
    page,
  }) => {
    await page.goto("/apps/video")
    const trigger = page.getByRole("button", { name: "More settings" })
    await expect(trigger).toBeVisible()
    const chevron = trigger.locator("svg")
    const names = await chevron.evaluate(
      (element) => getComputedStyle(element).transitionProperty
    )
    expect(names.split(", ")).toContain("rotate")
    await trigger.click()
    await page.waitForTimeout(60)
    const turning = await chevron.evaluate(
      (element) => getComputedStyle(element).rotate
    )
    expect(turning).not.toBe("180deg")
    await expect(chevron).toHaveCSS("rotate", "180deg")
  })
})

test.describe("an app on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the sheet is the phone's")

  for (const appId of ["image", "video"]) {
    test(`opens the inputs and Generate from the 66 by 44 Generate key, ${appId}`, async ({
      page,
    }) => {
      await page.goto(`/apps/${appId}`)
      const region = page.getByRole("region", { name: "Your results" })
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
      await expect(sheet.locator('[data-slot="chip-row"]')).toHaveCount(0)
    })
  }
})
