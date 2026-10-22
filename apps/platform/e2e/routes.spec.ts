import { readFileSync } from "node:fs"
import { expect, type Page, test } from "@playwright/test"

const gatewayOrigin = "http://127.0.0.1:8797"
const missingId = "00000000-0000-4000-8000-000000000000"
const missingAppId = "no-such-app"
const png = readFileSync(
  new URL("../src/gallery/fixtures/demo-image-1-1.png", import.meta.url)
)

type Seeded = {
  assetId: string
  characterId: string
  appIds: string[]
}

async function seed(): Promise<Seeded> {
  const uploaded = await fetch(`${gatewayOrigin}/api/assets`, {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: png,
  })
  const asset: { asset: { id: string } } = await uploaded.json()
  const created = await fetch(`${gatewayOrigin}/api/characters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Ana",
      references: [asset.asset.id],
      notes: "",
    }),
  })
  const character: { character: { id: string } } = await created.json()
  const listed = await fetch(`${gatewayOrigin}/api/apps`)
  const apps: { apps: Array<{ id: string }> } = await listed.json()
  return {
    assetId: asset.asset.id,
    characterId: character.character.id,
    appIds: apps.apps.map((app) => app.id),
  }
}

function routesOf(seeded: Seeded): string[] {
  return [
    "/",
    "/welcome",
    "/privacy",
    "/terms",
    "/apps",
    "/apps?q=nothing-matches-this",
    ...seeded.appIds.map((id) => `/apps/${id}`),
    `/apps/${missingAppId}`,
    "/library",
    `/library?view=${seeded.assetId}`,
    "/characters",
    "/characters/new",
    `/characters/${seeded.characterId}`,
    "/history",
    `/history/${missingId}`,
    "/agent",
    `/agent/${missingId}`,
    "/connect",
    "/connect?client=chatgpt",
    "/connect?client=other",
    "/connect?client=api",
    "/settings",
    "/unlock",
    "/gallery",
    "/no-such-page",
  ]
}

function isHandledRefusal(text: string, url: string): boolean {
  return (
    url.includes("/api/") &&
    /status of 4\d\d/.test(text) &&
    !text.includes("status of 401")
  )
}

function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() !== "error") {
      return
    }
    const text = message.text()
    if (!isHandledRefusal(text, message.location().url)) {
      errors.push(text)
    }
  })
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("response", (response) => {
    if (response.status() >= 500) {
      errors.push(`${response.status()} from ${response.url()}`)
    }
  })
  return errors
}

function sidewaysOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const scrollers = [
      document.documentElement,
      ...document.querySelectorAll("main"),
    ]
    return Math.max(
      ...scrollers.map((element) =>
        Math.max(0, element.scrollWidth - element.clientWidth - 1)
      )
    )
  })
}

const secondsPerRoute = 5

let seeded: Seeded = { assetId: missingId, characterId: missingId, appIds: [] }

test.beforeAll(async () => {
  seeded = await seed()
})

test("every route renders without console errors", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  const routes = routesOf(seeded)
  test.setTimeout(routes.length * secondsPerRoute * 1000)
  for (const path of routes) {
    const errors = watchErrors(page)
    await page.goto(path)
    await expect(page.locator("#root")).not.toBeEmpty()
    await page.waitForLoadState("networkidle")
    expect(errors, `console errors on ${path}`).toEqual([])
    expect(await sidewaysOverflow(page), `sideways scroll on ${path}`).toBe(0)
    page.removeAllListeners("console")
    page.removeAllListeners("pageerror")
    page.removeAllListeners("response")
  }
})

test("the first visit opens Explore at / with its banner", async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto("/")
  await expect(
    page.getByRole("region", { name: "Apps", exact: true })
  ).toBeVisible()
  expect(new URL(page.url()).pathname).toBe("/")
  const banner = page.locator("[data-slot=hero]")
  await expect(banner).toBeVisible()
  await expect(banner).toContainText("Make images and video on your own key")
  expect(errors).toEqual([])
})

test("/welcome and /explore open Explore, and the logo opens Explore from every page that shows it", async ({
  page,
}, info) => {
  const errors = watchErrors(page)
  for (const path of ["/welcome", "/explore"]) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/$/)
    await expect(
      page.getByRole("region", { name: "Apps", exact: true })
    ).toBeVisible()
  }
  const paths =
    info.project.name === "phone"
      ? ["/apps/image"]
      : ["/apps/image", "/library", "/history"]
  for (const path of paths) {
    await page.goto(path)
    const bar = page.locator("header[data-slot='app-bar']")
    const logo = bar
      .locator("[data-slot='app-bar-mark']")
      .nth(info.project.name === "phone" ? 1 : 0)
      .locator("a")
    await logo.click()
    await expect(page, `the logo on ${path}`).toHaveURL(/\/$/)
  }
  expect(errors).toEqual([])
})
