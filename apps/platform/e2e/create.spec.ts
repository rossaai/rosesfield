import { expect, type Locator, test } from "@playwright/test"
import { answerOwnLists } from "./own-lists"

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

  test("docks the prompt bar 16 px above the bottom, 880 by 124, with Generate as its 120 by 80 tile and the 65 by 32 References tile first on a text only default", async ({
    page,
  }) => {
    await page.goto("/apps/image")
    const bar = page.locator('[data-slot="composer"][data-bar="prompt"]')
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
    const tile = bar.locator('[data-slot="composer-attachments-edge"]')
    await expect(tile).toHaveCount(1)
    const tileBox = await boxOf(tile)
    expect([tileBox.width, tileBox.height]).toEqual([65, 32])
    expect(tileBox.x).toBe(row.x)
  })

  test("keeps the bar in place while the page scrolls", async ({ page }) => {
    await page.goto("/apps/image")
    const bar = page.locator('[data-slot="composer"][data-bar="prompt"]')
    const before = await boxOf(bar)
    await page.mouse.wheel(0, 600)
    expect(await boxOf(bar)).toEqual(before)
  })

  test("opens on How it works while you have no output", async ({ page }) => {
    await answerOwnLists(page, new Set())
    await page.goto("/apps/image")
    const how = page.getByRole("tab", { name: "How it works" })
    await expect(how).toHaveAttribute("aria-selected", "true")
    const history = await boxOf(page.getByRole("tab", { name: "History" }))
    expect(history.height).toBe(30)
  })
})

test.describe("Image's References and Elements tile", () => {
  test.skip(({ isMobile }) => isMobile, "the bar shows from 768 px")

  test("moves a text only model to Qwen Image Edit 2511 when you add a reference, and shows the change on the model chip", async ({
    page,
  }) => {
    await page.goto("/apps/image")
    const bar = page.locator('[data-slot="composer"][data-bar="prompt"]')
    const chip = bar.locator(modelRow).first()
    await expect(chip).toContainText("Z-Image Turbo")
    const chooser = page.waitForEvent("filechooser")
    await bar.getByRole("button", { name: "References" }).click()
    await (await chooser).setFiles(
      new URL("../src/gallery/fixtures/demo-image-1-1.png", import.meta.url)
        .pathname
    )
    await expect(chip).toContainText("Qwen Image Edit 2511")
    await expect(bar.locator("img")).toHaveCount(1)
    await expect(
      bar.locator('[data-slot="composer-attachments-edge"]')
    ).toHaveCount(1)
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

  test("hugs the model chip around its name's text, the text plus 66 px, the mark 12 px in and the text 8 px after it", async ({
    page,
  }) => {
    await page.goto("/apps/image")
    const chip = page
      .locator('[data-slot="composer"][data-bar="prompt"]')
      .locator(modelRow)
      .first()
    await expect(chip).toBeVisible()
    const text = await chip
      .locator('[data-slot="model-row-name"]')
      .evaluate((node) => {
        const range = document.createRange()
        range.selectNodeContents(node)
        const box = range.getBoundingClientRect()
        return { x: box.x, width: box.width }
      })
    const mark = await boxOf(chip.locator('[data-slot="model-row-mark"]'))
    const box = await boxOf(chip)
    expect(Math.round(box.width - text.width)).toBe(66)
    expect(Math.round(mark.x - box.x)).toBe(12)
    expect(Math.round(text.x - (mark.x + mark.width))).toBe(8)
    await expect(chip).toHaveCSS("border-left-width", "0px")
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

  test("stacks 302 px parts 8 px apart: 30 px mode tabs, a 302 by 130 start frame with Change 6 px from its corner, a 302 px prompt and a 36 px model row", async ({
    page,
  }) => {
    await page.goto("/apps/video")
    const column = page.locator('[data-slot="composer"]')
    await expect(column).toBeVisible()
    const tab = await boxOf(column.getByRole("tab").first())
    expect(tab.height).toBe(30)
    const frame = column.locator('[data-slot="composer-attachments-tiles"]')
    const frameBox = await boxOf(frame)
    expect([frameBox.width, frameBox.height]).toEqual([302, 130])
    const change = await boxOf(
      frame.locator('[data-slot="start-frame-change"]')
    )
    expect(frameBox.x + frameBox.width - (change.x + change.width)).toBe(6)
    expect(change.y - frameBox.y).toBe(6)
    const prompt = await boxOf(
      column.locator('[data-slot="composer-prompt-block"]')
    )
    expect(prompt.width).toBe(302)
    const row = await boxOf(column.locator(modelRow))
    expect([row.width, row.height]).toEqual([302, 36])
    expect(frameBox.y).toBe(tab.y + tab.height + 8)
  })
})

test.describe("the tray and rhythm of Video's column", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("holds the mode tabs 16 px in from the tray's edge, all inside it", async ({
    page,
  }) => {
    await page.goto("/apps/video")
    const column = page.locator('[data-slot="composer"]')
    await expect(column).toBeVisible()
    const tab = await boxOf(column.getByRole("tab").first())
    const tray = await boxOf(column.locator('[data-slot="composer-tray"]'))
    expect(tab.x).toBe(tray.x + 16)
    const last = await boxOf(column.getByRole("tab").last())
    expect(last.x + last.width).toBeLessThanOrEqual(tray.x + tray.width - 16)
  })

  test("fits every part above the footer at rest on LTX 2.5, with an Elements chip in the prompt", async ({
    page,
  }) => {
    await page.goto("/apps/video")
    const column = page.locator('[data-slot="composer"]')
    await expect(column.locator(modelRow)).toContainText("LTX 2.5")
    await expect(column.getByRole("button", { name: "Elements" })).toBeVisible()
    const parts = column.locator('[data-slot="composer-prompt"]')
    await expect
      .poll(() =>
        parts.evaluate((node) => node.scrollHeight <= node.clientHeight)
      )
      .toBe(true)
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

test.describe("Video's mode switch and column fit", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("puts the 302 by 26 mode switch 8 px under the start frame and 16 px over the drop zone, and ends the last row 8 px above Generate in every tab", async ({
    page,
  }) => {
    await page.goto("/apps/video")
    const column = page.locator('[data-slot="composer"]')
    await expect(column.locator(modelRow)).toContainText("LTX 2.5")
    const frame = await boxOf(
      column.locator('[data-slot="composer-attachments-tiles"]')
    )
    const toggle = await boxOf(column.getByRole("radiogroup"))
    expect([toggle.width, toggle.height]).toEqual([302, 26])
    expect(toggle.y).toBe(frame.y + frame.height + 8)
    const wells = await boxOf(column.locator('[data-slot="video-wells"]'))
    expect(wells.y).toBe(toggle.y + toggle.height + 16)
    const parts = column.locator('[data-slot="video-parts"]')
    const footer = column.locator('[data-slot="composer-toolbar"]')
    for (const [tab, model] of [
      ["Text and image", "LTX 2.5"],
      ["References", "Seedance 2.5"],
      ["Two frames", "Seedance 2.5"],
    ] as const) {
      await column.getByRole("tab", { name: tab, exact: true }).click()
      await expect(column.locator(modelRow)).toContainText(model)
      await expect
        .poll(async () => {
          const bottom = await parts.evaluate((node) =>
            Math.max(
              ...[...node.children].map(
                (child) => child.getBoundingClientRect().bottom
              )
            )
          )
          return Math.round((await boxOf(footer)).y - bottom)
        })
        .toBe(8)
    }
  })
})

test.describe("Video's model picker and its settings", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("lists the open-weights and the hosted models of the tab in one picker, LTX 2.5 with its top resolution and length range", async ({
    page,
  }) => {
    await page.goto("/apps/video")
    const column = page.locator('[data-slot="composer"]')
    await expect(column).toBeVisible()
    const switches = column.getByRole("radiogroup")
    await expect(switches).toHaveCount(1)
    await expect(switches.getByRole("radio")).toHaveText(["Video", "Extend"])
    await column.locator(modelRow).click()
    const list = page.locator('[data-slot="model-picker"]')
    await expect(list).toBeVisible()
    const ltx = list
      .locator('[data-slot="model-row"]:has([data-model="ltx-2-5"])')
      .first()
    await expect(ltx).toContainText("720p")
    await expect(ltx).toContainText("2 to 5 s")
  })

  test("turns the Advanced chevron over the control timing instead of jumping", async ({
    page,
  }) => {
    await page.goto("/apps/video")
    const trigger = page.getByRole("button", { name: "Advanced" })
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
      await expect(
        page.locator('[data-slot="composer"][data-bar="prompt"]')
      ).toHaveCount(0)
      await expect(page.locator('[data-slot="composer"]')).toHaveCount(0)
      const edge = await boxOf(region.getByRole("tablist").first())
      expect(edge.x).toBe(16)
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

test.describe("Video's runs on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the phone's inset")

  test("starts the run's title and its tile on the line of the tabs, 16 px in", async ({
    page,
  }) => {
    const started = await fetch("http://127.0.0.1:8797/api/apps/video/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: { model: "ltx-2-5", prompt: "a paper boat on a pond" },
      }),
    })
    expect(started.ok).toBe(true)
    const made: { run: { id: string } } = await started.json()
    await answerOwnLists(page, new Set([made.run.id]))
    await page.goto("/apps/video")
    const region = page.getByRole("region", { name: "Your results" })
    const tabs = await boxOf(region.getByRole("tablist").first())
    const run = region.locator('[data-slot="app-stage-scroll"] article').first()
    await expect(run).toBeVisible({ timeout: 20_000 })
    const tile = run.locator("video, img").first()
    await expect(tile).toBeVisible({ timeout: 20_000 })
    expect(tabs.x).toBe(16)
    expect((await boxOf(run)).x).toBe(tabs.x)
    await expect.poll(async () => (await boxOf(tile)).x).toBeCloseTo(tabs.x, 0)
  })
})
