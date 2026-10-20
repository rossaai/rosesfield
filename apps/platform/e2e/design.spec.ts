import { readFileSync } from "node:fs"
import { expect, type Locator, test } from "@playwright/test"

const tokens = readFileSync(
  new URL("../../../packages/ui/src/tokens.css", import.meta.url),
  "utf8"
)
const generated: { files: Array<{ path: string }> } = JSON.parse(
  readFileSync(new URL("../../../generated.json", import.meta.url), "utf8")
)

function token(name: string): string {
  const match = new RegExp(`\\n  ${name}: ([^;]+);`).exec(tokens)
  if (match?.[1] === undefined) {
    throw new Error(`tokens.css declares no ${name}`)
  }
  return match[1]
}

function light(name: string): string {
  const value = token(name)
  return /var\(--if-light, (#[0-9a-f]{6})\)/.exec(value)?.[1] ?? value
}

function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((at) =>
    Number.parseInt(hex.slice(at, at + 2), 16)
  )
  return `rgb(${r}, ${g}, ${b})`
}

async function style(locator: Locator, property: string): Promise<string> {
  return locator.evaluate(
    (element, name) => getComputedStyle(element).getPropertyValue(name),
    property
  )
}

test("a component of each family draws the generated theme's values", async ({
  page,
}) => {
  await page.goto("/gallery")
  const pane = page.locator('#button [data-theme="light"]').first()
  await expect(pane).toBeVisible()
  expect(await style(pane, "background-color")).toBe(rgb(light("--canvas")))
  expect(await style(pane, "color")).toBe(rgb(light("--ink")))
  expect(await style(pane, "border-top-left-radius")).toBe(
    token("--radius-card")
  )
  const button = pane.locator("button").first()
  expect(await style(button, "font-size")).toBe(token("--text-body"))
  expect(await style(button, "height")).toBe(token("--spacing-button"))
  expect(await style(button, "border-top-left-radius")).toBe(
    token("--radius-full")
  )
  expect(
    await page.evaluate(() => document.fonts.check("14px Montserrat"))
  ).toBe(true)

  for (const [utility, suffix] of [
    ["material-thin", "-thin"],
    ["material", ""],
    ["material-thick", "-thick"],
  ]) {
    const tile = page.locator(
      `[data-theme="light"] [data-material="${utility}"]`
    )
    await expect(tile).toBeVisible()
    expect(await style(tile, "backdrop-filter")).toBe(
      token(`--material-filter${suffix}`)
    )
  }
})

test("the favicon, every manifest icon, the lockups and the faces answer 200", async ({
  page,
  request,
}) => {
  await page.goto("/")
  const favicon = await page
    .locator('link[rel="icon"][type="image/svg+xml"]')
    .getAttribute("href")
  expect(favicon).toBe("/icons/favicon.svg")
  const served = generated.files
    .map((file) => file.path)
    .filter((path) => path.startsWith("apps/platform/public/"))
    .map((path) => path.slice("apps/platform/public".length))
  for (const size of ["icon-any-192", "icon-any-512", "icon-maskable-512"]) {
    expect(served).toContain(`/icons/${size}.png`)
  }
  for (const path of served) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(200)
  }
})
