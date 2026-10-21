import { expect, type Locator, type Page, test } from "@playwright/test"

const photo = new URL(
  "../src/gallery/fixtures/demo-image-1-1.png",
  import.meta.url
).pathname

async function boxOf(
  locator: Locator
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("the element has no box")
  }
  return box
}

async function addPhoto(page: Page, place: Locator): Promise<void> {
  await place.getByRole("button", { name: /Add an image/ }).click()
  const chooser = page.waitForEvent("filechooser")
  await page.getByRole("menuitem", { name: "Upload" }).click()
  await (await chooser).setFiles(photo)
  await expect(place.locator("img").first()).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
})

test.describe("Lip sync's column", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("shows From a photo and From a clip, the Face well, the Words switch between Audio and Text, the model row and Generate", async ({
    page,
  }) => {
    await page.goto("/apps/lipsync")
    const tabs = page.getByRole("tablist", { name: "Start from" })
    await expect(tabs.getByRole("tab")).toHaveText([
      "From a photo",
      "From a clip",
    ])
    const parts = page.locator('[data-slot="lipsync-parts"]')
    await expect(parts.getByText("Photo", { exact: true })).toBeVisible()
    const words = parts.locator('[data-slot="lipsync-words"] [role="radio"]')
    await expect(words).toHaveText(["Audio", "Text"])
    await expect(
      parts.getByRole("button", { name: /^Model/ }).first()
    ).toBeVisible()
    await expect(page.locator('[data-slot="generate-button"]')).toBeVisible()
  })
})

test.describe("Lip sync's Generate before the words", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("with a photo and no words starts no run, moves focus to the Words field and says to add one", async ({
    page,
  }) => {
    const starts: string[] = []
    page.on("request", (request) => {
      if (request.method() === "POST" && /\/runs$/.test(request.url())) {
        starts.push(request.url())
      }
    })
    await page.goto("/apps/lipsync")
    const parts = page.locator('[data-slot="lipsync-parts"]')
    await addPhoto(page, parts)
    await page.locator('[data-slot="generate-button"]').click()
    const words = parts.locator('[data-slot="lipsync-words"]')
    await expect(words.getByText("Add at least one")).toBeVisible()
    await expect
      .poll(() =>
        words.evaluate((element) =>
          element.contains(element.ownerDocument.activeElement)
        )
      )
      .toBe(true)
    expect(starts).toEqual([])
  })
})

test.describe("Lip sync's Text choice", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("on Text shows a box for your line", async ({ page }) => {
    await page.goto("/apps/lipsync")
    const words = page.locator('[data-slot="lipsync-words"]')
    await words.getByRole("radio", { name: "Text" }).click()
    await expect(words.getByRole("textbox", { name: "Script" })).toBeVisible()
  })
})

test.describe("Lip sync's Text run", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("makes the speech first, then the video from its audio, and History lists both runs", async ({
    page,
  }) => {
    await page.goto("/apps/lipsync")
    const parts = page.locator('[data-slot="lipsync-parts"]')
    await addPhoto(page, parts)
    const words = parts.locator('[data-slot="lipsync-words"]')
    await words.getByRole("radio", { name: "Text" }).click()
    await words
      .getByRole("textbox", { name: "Script" })
      .fill("Hello, this is the line I typed for the photo.")
    const speechStart = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/api\/apps\/audio\/runs$/.test(response.url())
    )
    const videoStart = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/api\/apps\/lipsync\/runs$/.test(response.url()),
      { timeout: 30_000 }
    )
    await page.locator('[data-slot="generate-button"]').click()
    const speech = await speechStart
    expect(speech.status()).toBe(202)
    const speechKey = speech.request().headers()["idempotency-key"] ?? ""
    expect(speechKey).toMatch(/-speech$/)
    const video = await videoStart
    expect(video.status()).toBe(202)
    const videoKey = video.request().headers()["idempotency-key"] ?? ""
    expect(videoKey).toBe(speechKey.replace(/-speech$/, "-video"))
    const speechId: string = (await speech.json()).run.id
    const videoId: string = (await video.json()).run.id
    const sent = video.request().postDataJSON()
    expect(sent.inputs).not.toHaveProperty("speechText")
    expect(sent.inputs).not.toHaveProperty("speechModel")
    const made = await page.request.get(`/api/runs/${speechId}`)
    const spoken = (await made.json()).run.outputs
    expect(spoken).toHaveLength(1)
    expect(sent.inputs.audio).toEqual(spoken)
    const listed = await page.request.get("/api/runs")
    const history: { id: string; appId: string }[] = (await listed.json()).runs
    expect(
      history
        .filter((run) => run.id === speechId || run.id === videoId)
        .map((run) => run.appId)
        .sort()
    ).toEqual(["audio", "lipsync"])
  })
})

test.describe("Lip sync on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the sheet is the phone's")

  test("gives the canvas the full width, opens the inputs in a sheet, and sets Generate at the sheet's bottom edge", async ({
    page,
  }) => {
    await page.goto("/apps/lipsync")
    const viewport = page.viewportSize()
    if (viewport === null) {
      throw new Error("the page has no viewport")
    }
    const results = page.getByRole("region", { name: "Your results" })
    await expect(results).toBeVisible()
    const canvas = await boxOf(results)
    expect(canvas.x).toBeCloseTo(0, 0)
    expect(canvas.width).toBeCloseTo(viewport.width, 0)
    await page.locator('[data-slot="app-bar-tabGenerate"]').click()
    const sheet = page.getByRole("dialog")
    await expect(sheet).toBeVisible()
    await expect(sheet.locator('[data-slot="lipsync-words"]')).toBeVisible()
    const generate = await boxOf(sheet.locator('[data-slot="generate-button"]'))
    const panel = await boxOf(sheet)
    const bottom = panel.y + panel.height
    expect(bottom).toBeCloseTo(viewport.height, 0)
    expect(bottom - (generate.y + generate.height)).toBeLessThan(32)
  })
})
