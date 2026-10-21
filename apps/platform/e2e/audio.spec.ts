import { expect, type Locator, type Page, test } from "@playwright/test"

const tabs = [
  { name: "Speech", model: "Chatterbox" },
  { name: "Voice clone", model: "Chatterbox" },
  { name: "Voice change", model: "Chatterbox voice change" },
  { name: "Music", model: "MiniMax-Music3" },
  { name: "Sound effects", model: "Stable Audio 3 Medium" },
]

function silentWav(seconds: number): Buffer {
  const rate = 8000
  const data = rate * seconds * 2
  const header = Buffer.alloc(44)
  header.write("RIFF", 0)
  header.writeUInt32LE(36 + data, 4)
  header.write("WAVE", 8)
  header.write("fmt ", 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(rate, 24)
  header.writeUInt32LE(rate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write("data", 36)
  header.writeUInt32LE(data, 40)
  return Buffer.concat([header, Buffer.alloc(data)])
}

async function upload(
  page: Page,
  field: Locator,
  file: { name: string; mimeType: string; buffer: Buffer }
): Promise<void> {
  await field.getByRole("button", { name: /Add audio/ }).click()
  const chooser = page.waitForEvent("filechooser")
  await page.getByRole("menuitem", { name: "Upload" }).click()
  await (await chooser).setFiles(file)
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
})

test.describe("Audio's column", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("shows five tabs, each opening on its graph, with the model row and Generate", async ({
    page,
  }) => {
    await page.goto("/apps/audio")
    for (const { name, model } of tabs) {
      await page.getByRole("tab", { name, exact: true }).click()
      await expect(
        page.getByRole("tab", { name, exact: true })
      ).toHaveAttribute("aria-selected", "true")
      await expect(
        page.getByRole("button", { name: `Model ${model}`, exact: true })
      ).toBeVisible()
      await expect(
        page.getByRole("button", { name: /^Generate/ }).first()
      ).toBeVisible()
    }
  })

  test("shows a recording you add by its name and length with a play button, and refuses a file that is not audio with the reason", async ({
    page,
  }) => {
    await page.goto("/apps/audio#clone")
    const clone = page.locator('[data-slot="field"]', {
      hasText: "Voice recording",
    })
    await upload(page, clone, {
      name: "interview.wav",
      mimeType: "audio/wav",
      buffer: silentWav(7),
    })
    const row = clone.locator('[data-slot="audio-row"]')
    await expect(row.getByText("interview.wav")).toBeVisible()
    await expect(row.getByText("7 seconds")).toBeVisible()
    await expect(row.getByRole("button", { name: "Play" })).toBeVisible()
    await page.getByRole("tab", { name: "Voice change", exact: true }).click()
    const source = page.locator('[data-slot="field"]', {
      hasText: "Your recording",
    })
    await upload(page, source, {
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("notes"),
    })
    await expect(source.locator('[data-slot="field-message"]')).toHaveText(
      "This input takes audio. Pick another file."
    )
    await expect(source.locator('[data-slot="audio-row"]')).toHaveCount(0)
  })

  test("opens the old Voice address on Audio's Voice clone", async ({
    page,
  }) => {
    await page.goto("/apps/voice")
    await expect(page).toHaveURL(/\/apps\/audio#clone$/)
    await expect(
      page.getByRole("tab", { name: "Voice clone" })
    ).toHaveAttribute("aria-selected", "true")
  })
})

test.describe("Audio on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the sheet is the phone's")

  test("opens the inputs in a sheet whose Generate sits at the bottom edge", async ({
    page,
  }) => {
    await page.goto("/apps/audio")
    await expect(
      page.getByRole("heading", { name: "Audio", level: 1 })
    ).toBeAttached()
    await page.locator('[data-slot="app-bar-tabGenerate"]').click()
    const sheet = page.getByRole("dialog")
    await expect(sheet.getByRole("tab", { name: "Speech" })).toBeVisible()
    const generate = await sheet
      .getByRole("button", { name: /^Generate/ })
      .boundingBox()
    const viewport = page.viewportSize()
    if (generate === null || viewport === null) {
      throw new Error("the sheet shows no Generate")
    }
    expect(viewport.height - (generate.y + generate.height)).toBeLessThan(48)
  })
})
