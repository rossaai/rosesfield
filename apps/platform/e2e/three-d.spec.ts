import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
})

test.describe("3D's column", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("opens on From text, the first of its two tabs, with Meshy 7.1, its prompt above the model, Art style and Generate with its price", async ({
    page,
  }) => {
    await page.goto("/apps/three-d")
    const column = page.locator("aside")
    const picker = column.getByRole("button", { name: /^Model/ })
    await expect(picker).toContainText("7.1")
    await expect(column.getByRole("tab")).toHaveText([
      "From text",
      "From an image",
    ])
    await expect(
      column.getByRole("tab", { name: "From text" })
    ).toHaveAttribute("aria-selected", "true")
    const prompt = column.getByRole("textbox", { name: "Prompt" })
    await expect(prompt).toBeVisible()
    const promptBox = await prompt.boundingBox()
    const pickerBox = await picker.boundingBox()
    if (promptBox === null || pickerBox === null) {
      throw new Error("the column shows no prompt or no model")
    }
    expect(promptBox.y + promptBox.height).toBeLessThan(pickerBox.y)
    await expect(
      column.getByRole("combobox", { name: "Art style" })
    ).toBeVisible()
    await expect(
      column.getByRole("button", { name: /Generate.*Comfy credits/ }).last()
    ).toBeVisible()
  })
})

test.describe("3D's column on From an image", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("makes a model from a photo on From an image, with the photo input and Meshy 7.1", async ({
    page,
  }) => {
    await page.goto("/apps/three-d")
    const column = page.locator("aside")
    await column.getByRole("tab", { name: "From an image" }).click()
    await expect(
      column.getByRole("tab", { name: "From an image" })
    ).toHaveAttribute("aria-selected", "true")
    await expect(column.getByText("Add an image")).toBeVisible()
    await expect(column.getByRole("button", { name: /^Model/ })).toContainText(
      "7.1"
    )
    await expect(column.getByRole("textbox", { name: "Prompt" })).toHaveCount(0)
  })
})

test.describe("3D's Advanced settings", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("centres Target polycount's icon, number and buttons on its field's middle", async ({
    page,
  }) => {
    await page.goto("/apps/three-d")
    const column = page.locator("aside")
    await column.getByRole("button", { name: "Advanced" }).click()
    const field = column.getByRole("group", { name: "Target polycount" })
    await expect(field).toBeVisible()
    const middleOf = async (
      part: ReturnType<typeof page.locator>
    ): Promise<number> => {
      const box = await part.boundingBox()
      if (box === null) {
        throw new Error("a part of the field is not drawn")
      }
      return box.y + box.height / 2
    }
    const middle = await middleOf(field)
    for (const part of [
      field.locator("[data-slot='stepper-lead'] svg"),
      field.getByRole("spinbutton"),
      field.getByRole("button").first(),
      field.getByRole("button").last(),
    ]) {
      expect(Math.abs((await middleOf(part)) - middle)).toBeLessThan(1)
    }
  })
})

test.describe("3D's model picker", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("lists the catalog's 3D models from text in the picker, each with its maker", async ({
    page,
  }) => {
    await page.goto("/apps/three-d")
    const column = page.locator("aside")
    const picker = column.getByRole("button", { name: /^Model/ })
    await expect(picker).toContainText("7.1")
    await expect(
      column.getByRole("combobox", { name: "Art style" })
    ).toBeVisible()
    await picker.click()
    const rows = page.locator("[role='listbox'] [data-slot='model-row']")
    await expect(rows.first()).toBeVisible()
    const names = await rows
      .locator("[data-slot='model-row-name']")
      .allTextContents()
    expect(names.some((name) => name.includes("7.1"))).toBe(true)
    expect(names.length).toBeGreaterThan(1)
  })
})

test.describe("3D on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the sheet is the phone's")

  test("opens the inputs in a sheet on From text with the prompt and Meshy 7.1, and Generate at its bottom edge", async ({
    page,
  }) => {
    await page.goto("/apps/three-d")
    await page.locator('[data-slot="app-bar-tabGenerate"]').click()
    const sheet = page.getByRole("dialog")
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole("tab")).toHaveText([
      "From text",
      "From an image",
    ])
    await expect(sheet.getByRole("textbox", { name: "Prompt" })).toBeVisible()
    await expect(sheet.getByRole("button", { name: /^Model/ })).toContainText(
      "7.1"
    )
    const generate = await sheet
      .getByRole("button", { name: /Generate/ })
      .last()
      .boundingBox()
    const viewport = page.viewportSize()
    if (generate === null || viewport === null) {
      throw new Error("the sheet shows no Generate")
    }
    expect(viewport.height - (generate.y + generate.height)).toBeLessThan(48)
  })
})
