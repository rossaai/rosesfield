import { expect, type Locator, test } from "@playwright/test"
import { keepDeclaredModels } from "./last-used"

test.beforeEach(async ({ page }) => {
  await keepDeclaredModels(page, ["video"])
})

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

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
})

test.describe("Video's sheet on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the sheet is the phone's")

  test("starts the start frame 8 px under the mode tabs, as the desktop column does", async ({
    page,
  }) => {
    await page.goto("/apps/video")
    await expect(
      page.getByRole("region", { name: "Your results" })
    ).toBeVisible()
    await page.locator('[data-slot="app-bar-tabGenerate"]').click()
    const sheet = page.getByRole("dialog")
    await expect(sheet).toBeVisible()
    await sheet.evaluate((element) =>
      Promise.all(
        element
          .getAnimations({ subtree: true })
          .filter(
            (animation) =>
              animation.effect?.getComputedTiming().iterations !== Infinity
          )
          .map((animation) => animation.finished.catch(() => undefined))
      )
    )
    const tab = await sheet.getByRole("tab").first().boundingBox()
    const frame = await sheet
      .locator('[data-slot="composer-attachments-tiles"]')
      .boundingBox()
    if (tab === null || frame === null) {
      throw new Error("the sheet has no tab or frame")
    }
    expect(frame.y - (tab.y + tab.height)).toBe(8)
  })
})

test.describe("Video's settings in the column", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("opens on LTX 2.5 with no chip in the prompt, and its format, resolution and length as rows below the model, each a dropdown or the length stepper, with Advanced closed", async ({
    page,
  }) => {
    await page.goto("/apps/video")
    const column = page.locator('[data-slot="composer"]')
    const chip = column.locator(modelRow)
    await expect(chip).toContainText("LTX 2.5")
    const format = column.getByRole("combobox", { name: "Format" })
    const resolution = column.getByRole("combobox", { name: "Resolution" })
    const length = column.getByRole("group", { name: "Length" })
    await expect(format).toHaveText("16:9")
    await expect(resolution).toHaveText("480p")
    await expect(length).toHaveCount(1)
    await expect(column.getByRole("button", { name: "Elements" })).toHaveCount(
      0
    )
    await expect(column.getByRole("button", { name: /Sound/ })).toHaveCount(0)
    await expect(column.getByRole("switch")).toHaveCount(0)
    await expect(column.getByRole("radiogroup")).toHaveCount(0)
    const chipY = (await boxOf(chip)).y
    const formatY = (await boxOf(format)).y
    const resolutionY = (await boxOf(resolution)).y
    expect(formatY).toBeGreaterThan(chipY)
    expect(resolutionY).toBeGreaterThan(formatY)
    expect((await boxOf(length)).y).toBeGreaterThan(resolutionY)
    await expect(
      column.getByRole("button", { name: "Advanced" })
    ).toHaveAttribute("aria-expanded", "false")
    await expect(column.getByText("Seed")).toHaveCount(0)
  })
})

test.describe("Video's mode switch and column fit", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("puts the drop zone 13 px under the start frame with no mode switch between them, and ends the last row 10 px above Generate, or 40 px over the fade when the column scrolls, in every tab", async ({
    page,
  }) => {
    await page.goto("/apps/video")
    const column = page.locator('[data-slot="composer"]')
    await expect(column.locator(modelRow)).toContainText("LTX 2.5")
    const frame = await boxOf(
      column.locator('[data-slot="composer-attachments-tiles"]')
    )
    const wells = await boxOf(column.locator('[data-slot="video-wells"]'))
    await expect(
      column.getByRole("radiogroup", { name: "Operation" })
    ).toHaveCount(0)
    expect(wells.width).toBe(frame.width)
    expect(wells.y).toBe(frame.y + frame.height + 13)
    const parts = column.locator('[data-slot="video-parts"]')
    const footer = column.locator('[data-slot="composer-toolbar"]')
    for (const [tab, model] of [
      ["Image", "LTX 2.5"],
      ["References", "Seedance 2.5"],
      ["Two frames", "Seedance 2.5"],
    ] as const) {
      await column.getByRole("tab", { name: tab, exact: true }).click()
      await expect(column.locator(modelRow)).toContainText(model)
      await expect
        .poll(async () => {
          const end = await parts.evaluate((node) => {
            const scroller = node.closest<HTMLElement>(
              "[data-slot='composer-prompt']"
            )
            scroller?.scrollTo({
              top: scroller.scrollHeight,
              behavior: "instant",
            })
            return {
              bottom: Math.max(
                ...[...node.children].map(
                  (child) => child.getBoundingClientRect().bottom
                )
              ),
              isClipped: scroller?.dataset.clipped === "yes",
            }
          })
          const gap = Math.round((await boxOf(footer)).y - end.bottom)
          return gap - (end.isClipped ? 40 : 10)
        })
        .toBe(0)
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
    await expect(column.getByRole("tab")).toHaveText([
      "Image",
      "References",
      "Two frames",
    ])
    await expect(column.getByRole("group", { name: "Length" })).toBeVisible()
    await expect(
      column.getByRole("radiogroup", { name: "Operation" })
    ).toHaveCount(0)
    await expect(column.getByRole("radio")).toHaveCount(0)
    await column.locator(modelRow).click()
    const list = page.locator('[data-slot="model-picker"]')
    await expect(list).toBeVisible()
    const ltx = list
      .locator('[data-slot="model-row"]:has([data-model="ltx-2-5"])')
      .first()
    await expect(ltx).toContainText("720p")
    await expect(ltx).toContainText("2 to 5 s")
  })
})
