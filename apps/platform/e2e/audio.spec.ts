import { expect, type Locator, type Page, test } from "@playwright/test"

const apps = [
  { id: "speech", name: "Speech", model: "chatterbox", chip: "Chatterbox" },
  { id: "voice-clone", name: "Voice clone", model: "chatterbox", chip: null },
  {
    id: "voice-change",
    name: "Voice change",
    model: "chatterbox-vc",
    chip: null,
  },
  { id: "music", name: "Music", model: "minimax-music-3", chip: null },
  {
    id: "sound-effects",
    name: "Sound effects",
    model: "stable-audio-3-medium",
    chip: "Stable Audio 3 Medium",
  },
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

async function expectOwnModel(
  page: Page,
  { id, model, chip }: (typeof apps)[number]
): Promise<void> {
  const priced = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      request.url().endsWith(`/api/apps/${id}/price`)
  )
  await page.goto(`/apps/${id}`)
  const body: { inputs: Record<string, unknown> } = (
    await priced
  ).postDataJSON()
  expect(body.inputs.model).toBe(model)
  const column = page.locator('[data-slot="composer"]')
  if (chip === null) {
    await expect(column.getByRole("button", { name: /^Model / })).toHaveCount(0)
    return
  }
  await expect(
    column.getByRole("button", { name: `Model ${chip}`, exact: true })
  ).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
})

test.describe("The audio apps' column", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("opens each audio app on its own model with Generate and no mode tabs, and shows the model chip only where the app offers two or more models", async ({
    page,
  }) => {
    for (const app of apps) {
      await expectOwnModel(page, app)
      await expect(
        page.getByRole("button", { name: /^Generate/ }).first()
      ).toBeVisible()
      for (const { name } of apps) {
        await expect(page.getByRole("tab", { name, exact: true })).toHaveCount(
          0
        )
      }
    }
  })

  test("shows a recording you add by its name and length with a play button, and refuses a file that is not audio with the reason", async ({
    page,
  }) => {
    await page.goto("/apps/voice-clone")
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
    await page.goto("/apps/voice-change")
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

  test("opens the old Voice and Audio addresses on the app that took their place", async ({
    page,
  }) => {
    await page.goto("/apps/voice")
    await expect(page).toHaveURL(/\/apps\/voice-clone$/)
    await page.goto("/apps/audio#music")
    await expect(page).toHaveURL(/\/apps\/music$/)
    await page.goto("/apps/audio")
    await expect(page).toHaveURL(/\/apps\/speech$/)
  })
})

test.describe("An audio app on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the sheet is the phone's")

  test("opens the inputs in a sheet whose Generate sits at the bottom edge", async ({
    page,
  }) => {
    await page.goto("/apps/speech")
    await expect(
      page.getByRole("heading", { name: "Speech", level: 1 })
    ).toBeAttached()
    await page.locator('[data-slot="app-bar-tabGenerate"]').click()
    const sheet = page.getByRole("dialog")
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
