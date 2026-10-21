import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
})

test.describe("Video's mode switch on the keyboard", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("moves focus to Extend on an arrow key and stays on Video, and leaves for Video edit's Extend tab on Space", async ({
    page,
  }) => {
    await page.goto("/apps/video")
    const group = page.getByRole("radiogroup", { name: "Operation" })
    const video = group.getByRole("radio", { name: "Video" })
    const extend = group.getByRole("radio", { name: "Extend" })
    await video.focus()
    await page.keyboard.press("ArrowRight")
    await expect(extend).toBeFocused()
    await page.waitForTimeout(300)
    expect(new URL(page.url()).pathname).toBe("/apps/video")
    await expect(video).toHaveAttribute("aria-checked", "true")
    await page.keyboard.press("ArrowLeft")
    await page.keyboard.press("ArrowRight")
    await page.waitForTimeout(300)
    expect(new URL(page.url()).pathname).toBe("/apps/video")
    await page.keyboard.press("Space")
    await expect(page).toHaveURL(/\/apps\/video-edit\?mode=extend/)
    await expect(page.getByRole("tab", { name: "Extend" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
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
