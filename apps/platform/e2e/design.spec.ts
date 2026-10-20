import { readFileSync } from "node:fs"
import { expect, type Locator, type Page, test } from "@playwright/test"
import { BUTTON } from "../../../packages/ui/src/contracts/button.generated"

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

function lightOf(name: string): string {
  const value = token(name)
  return /var\(--if-light, (#[0-9a-f]{6})\)/.exec(value)?.[1] ?? value
}

function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((at) =>
    Number.parseInt(hex.slice(at, at + 2), 16)
  )
  return `rgb(${r}, ${g}, ${b})`
}

function shadow(value: string): string {
  const match = /^0 (\S+) (\S+) rgb\(0 0 0 \/ ([\d.]+)\)$/.exec(value)
  if (match === null) {
    throw new Error(`${value} is not a one-layer shadow`)
  }
  const y = match[1] === "0" ? "0px" : match[1]
  return `rgba(0, 0, 0, ${match[3]}) 0px ${y} ${match[2]} 0px`
}

function contractVariable(token: string): string {
  const variables: Readonly<Record<string, readonly string[]>> =
    BUTTON.variables
  const name = variables[token]?.[0]
  if (name === undefined) {
    throw new Error(`the button contract maps ${token} to no variable`)
  }
  return name
}

async function style(locator: Locator, property: string): Promise<string> {
  return locator.evaluate(
    (element, name) => getComputedStyle(element).getPropertyValue(name),
    property
  )
}

function light(page: Page, entry: string): Locator {
  return page.locator(`#${entry} [data-theme="light"]`).first()
}

test.beforeEach(async ({ page }) => {
  await page.goto("/gallery")
})

test("controls: the button draws its contract's height, the type, the radius, the ground and the press duration", async ({
  page,
}) => {
  const pane = light(page, "button")
  await expect(pane).toBeVisible()
  expect(await style(pane, "background-color")).toBe(rgb(lightOf("--canvas")))
  expect(await style(pane, "color")).toBe(rgb(lightOf("--ink")))
  const button = pane.locator("button").first()
  const height = contractVariable(BUTTON.sizes.height.desktop.chrome)
  expect(await style(button, "height")).toBe(token(height))
  expect(await style(button, "font-size")).toBe(token("--text-body"))
  expect(await style(button, "border-top-left-radius")).toBe(
    token("--radius-full")
  )
  expect(await style(button, "background-color")).toBe(
    rgb(lightOf("--surface"))
  )
  expect(await style(button, "--press-down")).toMatch(
    new RegExp(`^${token("--duration-press")} `)
  )
  expect(
    await page.evaluate(() => document.fonts.check("14px Montserrat"))
  ).toBe(true)
})

test("fields: the input draws the field height, its inset and the full radius", async ({
  page,
}) => {
  const input = light(page, "input").locator('[data-slot="input"]').first()
  expect(await style(input, "height")).toBe(token("--spacing-field"))
  expect(await style(input, "padding-left")).toBe(token("--spacing-s5"))
  expect(await style(input, "border-top-left-radius")).toBe(
    token("--radius-full")
  )
})

test("display: the card draws the card radius, its inset and the surface", async ({
  page,
}) => {
  const card = light(page, "card").locator('[data-slot="card"]').first()
  expect(await style(card, "border-top-left-radius")).toBe(
    token("--radius-card")
  )
  expect(await style(card, "padding-top")).toBe(token("--spacing-s6"))
  expect(await style(card, "background-color")).toBe(rgb(lightOf("--surface")))
})

test("media: the tile draws the cell radius and its caption the caption size", async ({
  page,
}) => {
  const tile = light(page, "media-tile")
  expect(
    await style(
      tile.locator('[data-slot="media-tile"]').first(),
      "border-top-left-radius"
    )
  ).toBe(token("--radius-cell"))
  expect(
    await style(
      tile.locator('[data-slot="media-tile-caption"]').first(),
      "font-size"
    )
  ).toBe(token("--text-caption"))
})

test("layers: each material draws its filter and the float shadow", async ({
  page,
}) => {
  for (const [utility, suffix] of [
    ["material-thin", "-thin"],
    ["material", ""],
    ["material-thick", "-thick"],
  ]) {
    const surface = light(page, "material").locator(
      `[data-material="${utility}"]`
    )
    await expect(surface).toBeVisible()
    expect(await style(surface, "backdrop-filter")).toBe(
      token(`--material-filter${suffix}`)
    )
    const layers = (await style(surface, "box-shadow")).split(/,\s*(?=rgba)/)
    expect(layers.at(-1)).toBe(shadow(token("--shadow-float")))
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

async function pixelsAt(
  page: Page,
  box: { x: number; y: number; width: number; height: number },
  points: ReadonlyArray<readonly [number, number]>
): Promise<string[]> {
  const png = await page.screenshot({ clip: box })
  return page.evaluate(
    async ({ data, at }) => {
      const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0))
      const bitmap = await createImageBitmap(
        new Blob([bytes], { type: "image/png" })
      )
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const context = canvas.getContext("2d")
      if (context === null) {
        throw new Error("no 2d context")
      }
      context.drawImage(bitmap, 0, 0)
      return at.map(([x, y]) => {
        const [r, g, b] = context.getImageData(x, y, 1, 1).data
        return `rgb(${r}, ${g}, ${b})`
      })
    },
    { data: png.toString("base64"), at: points }
  )
}

test("a control without the ring class draws its focus ring 2 px inside its edge, where a tile that hides its overflow keeps it whole", async ({
  page,
}) => {
  const bare = await page.evaluate(() => {
    const tile = document.createElement("div")
    tile.id = "bare-tile"
    tile.style.cssText =
      "position: fixed; top: 40px; left: 40px; width: 120px; height: 80px; overflow: hidden; z-index: 99"
    const button = document.createElement("button")
    button.id = "bare-control"
    button.textContent = "Bare"
    button.style.cssText =
      "display: block; width: 100%; height: 100%; background: rgb(255, 255, 255)"
    tile.append(button)
    document.body.append(tile)
    button.focus()
    const style = getComputedStyle(button)
    return {
      isFocusVisible: button.matches(":focus-visible"),
      offset: style.outlineOffset,
      width: style.outlineWidth,
      color: style.outlineColor,
    }
  })
  expect(bare.isFocusVisible).toBe(true)
  expect(bare.width).toBe(token("--spacing-focus-ring"))
  expect(bare.offset).toBe(`-${token("--spacing-focus-ring")}`)
  const edges = await pixelsAt(page, { x: 40, y: 40, width: 120, height: 80 }, [
    [0, 40],
    [119, 40],
    [60, 0],
    [60, 79],
  ])
  expect(edges).toEqual([bare.color, bare.color, bare.color, bare.color])
})
