import { expect, type Page, test } from "@playwright/test"

const photo = new URL(
  "../src/gallery/fixtures/demo-image-1-1.png",
  import.meta.url
).pathname

const modelRow =
  '[data-slot="popover-trigger"]:has([data-slot="model-row-name"])'

async function skipWelcome(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
}

async function runCount(page: Page): Promise<number> {
  const answer = await page.request.get("/api/runs")
  const body: { runs: unknown[] } = await answer.json()
  return body.runs.length
}

async function openTraits(page: Page): Promise<void> {
  await skipWelcome(page)
  await page.goto("/apps/characters")
  await expect(page).toHaveURL(/\/characters\/new\?mode=traits$/)
  await expect(
    page
      .getByRole("radiogroup", { name: "How to make it" })
      .getByRole("radio", { name: "From traits" })
  ).toBeChecked()
}

test("a character from 1 photo shows in Characters with its photo and its count, and starts no run", async ({
  page,
}) => {
  await skipWelcome(page)
  await page.goto("/characters/new")
  await page.locator('[data-slot="drop-well"]').hover()
  await expect(page.locator('[data-slot="tooltip-content"]')).toContainText(
    "up to 10"
  )
  const runsBefore = await runCount(page)
  const name = `Ada ${test.info().project.name}`
  await page.getByRole("textbox").first().fill(name)
  await page.getByRole("button", { name: "Add an image" }).click()
  const chooser = page.waitForEvent("filechooser")
  await page.getByRole("menuitem", { name: "Upload" }).click()
  await (await chooser).setFiles(photo)
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(1)
  await page.getByRole("button", { name: "Save character" }).click()
  await expect(page).toHaveURL(/\/characters\/[0-9a-f-]+$/)
  await page.goto("/characters")
  const card = page.getByRole("link", { name: new RegExp(name) })
  await expect(card).toContainText("1 photo")
  await expect(card.locator("img")).toHaveCount(1)
  expect(await runCount(page)).toBe(runsBefore)
})

test.describe("the traits of Characters on a desktop", () => {
  test.skip(({ isMobile }) => isMobile, "the column panel shows from 768 px")

  test("open on the catalog's open-weights default for text to image, and the picker lists the models that make an image from text", async ({
    page,
  }) => {
    await openTraits(page)
    const trigger = page.locator(modelRow).first()
    await expect(trigger).toContainText("Z-Image Turbo")
    await trigger.click()
    const rows = page.getByRole("listbox").locator("[data-slot='model-row']")
    await expect(rows.first()).toBeVisible()
    expect(await rows.count()).toBeGreaterThan(1)
    const names = await page
      .getByRole("listbox")
      .getByRole("option")
      .evaluateAll((options) =>
        options.map((option) => option.getAttribute("aria-label") ?? "")
      )
    expect(names).toContain("Z-Image Turbo")
    expect(names).not.toContain("Qwen Image Edit 2511")
    expect(names.every((name) => name !== "")).toBe(true)
  })

  test("fill every trait at random, make portraits on the demo engine and save the ones you keep as a character", async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await openTraits(page)
    await page
      .getByRole("button", { name: "Fill every trait at random" })
      .click()
    await page
      .getByRole("button", { name: /^Generate/ })
      .first()
      .click()
    const save = page.getByRole("button", { name: "Save as character" })
    await expect(save.first()).toBeVisible({ timeout: 90_000 })
    await save.first().click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("textbox").fill("Mara")
    await dialog.getByRole("button", { name: "Save character" }).click()
    await expect(page).toHaveURL(/\/characters\/[0-9a-f-]+$/)
    await page.goto("/characters")
    const card = page.getByRole("link", { name: /Mara/ })
    await expect(card).toBeVisible()
    await expect(card).toContainText(/\d+ photos?/)
  })
})
