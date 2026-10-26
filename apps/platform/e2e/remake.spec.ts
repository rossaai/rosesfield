import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"

const gatewayOrigin = "http://127.0.0.1:8797"
const png = readFileSync(
  new URL("../src/gallery/fixtures/demo-image-1-1.png", import.meta.url)
)
const mp4 = readFileSync(
  new URL("../src/gallery/fixtures/demo-video-16-9.mp4", import.meta.url)
)

async function uploaded(bytes: Buffer, mime: string): Promise<string> {
  const response = await fetch(`${gatewayOrigin}/api/assets`, {
    method: "POST",
    headers: { "Content-Type": mime },
    body: new Uint8Array(bytes),
  })
  const body: { asset: { id: string } } = await response.json()
  return body.asset.id
}

async function savedCharacter(name: string): Promise<string> {
  const photo = await uploaded(png, "image/png")
  const response = await fetch(`${gatewayOrigin}/api/characters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, references: [photo], notes: "" }),
  })
  const body: { character: { id: string } } = await response.json()
  return body.character.id
}

const inputs = [
  "Reference edit",
  "Character",
  "Instructions",
  "Shots with no person",
  "Quality",
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
})

test.describe("Remake's column", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("holds the two wells with their limits, then the other inputs with no keep-sound switch, sends the reference's sound on, and shows No cost on the demo engine and Generate", async ({
    page,
  }) => {
    const priced = page.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        request.url().endsWith("/api/apps/remake/price")
    )
    await page.goto("/apps/remake")
    const column = page.locator('[data-slot="composer"]')
    await expect(column).toBeVisible()
    await expect(column).toContainText(
      "MP4, MOV or WebM, 2 to 12 seconds, 100 MB, 2 to 6 shots"
    )
    await expect(column).toContainText("1 saved character")
    const text = (await column.innerText()).replace(/\s+/g, " ")
    const places = inputs.map((label) => text.indexOf(label))
    expect(places.every((place) => place >= 0)).toBe(true)
    expect([...places].sort((a, b) => a - b)).toEqual(places)
    await expect(column.getByText("Keep the reference's sound")).toHaveCount(0)
    await expect(column.getByRole("switch")).toHaveCount(0)
    const body: { inputs: Record<string, unknown> } = (
      await priced
    ).postDataJSON()
    expect(body.inputs.keepSound).toBe("on")
    await expect(column.locator('[data-slot="remake-price"]')).toHaveText(
      "No cost on the demo engine"
    )
    await expect(column.locator('[data-slot="generate-button"]')).toBeVisible()
  })
})

test.describe("Remake on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the sheet is the phone's")

  test("opens the Inputs sheet on arrival, with both wells and Generate", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/apps/remake")
    const sheet = page.getByRole("dialog")
    await expect(sheet).toBeVisible()
    await expect(sheet).toContainText("Reference edit")
    await expect(sheet).toContainText("Character")
    await expect(sheet.locator('[data-slot="generate-button"]')).toBeVisible()
  })
})

test.describe("Remake from Use in", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("the server lists Remake open on bun", async () => {
    const response = await fetch(`${gatewayOrigin}/api/apps`)
    const body: { apps: Array<{ id: string; closedKey: string | null }> } =
      await response.json()
    const remake = body.apps.find((app) => app.id === "remake")
    expect(remake?.closedKey).toBeNull()
  })

  test("a character's Use in opens Remake with that character picked", async ({
    page,
  }) => {
    const characterId = await savedCharacter("Remake June")
    await page.goto(`/characters/${characterId}`)
    await page.getByRole("button", { name: "Use in" }).click()
    await page.getByRole("menuitem", { name: "Remake", exact: true }).click()
    await expect(page).toHaveURL(
      new RegExp(`/apps/remake\\?use=${characterId}`)
    )
    await expect(page.locator('[data-slot="composer"]')).toContainText(
      "Remake June"
    )
  })

  test("a library video's Use in fills the Reference edit well", async ({
    page,
  }) => {
    const videoId = await uploaded(mp4, "video/mp4")
    await page.goto(`/library?view=${videoId}`)
    await page.getByRole("button", { name: "Use in" }).click()
    await page.getByRole("menuitem", { name: "Remake", exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/apps/remake\\?use=${videoId}`))
    const column = page.locator('[data-slot="composer"]')
    await expect(column).not.toContainText(
      "MP4, MOV or WebM, 2 to 12 seconds, 100 MB, 2 to 6 shots"
    )
  })
})
