import { readFileSync } from "node:fs"
import { expect, type Page, test } from "@playwright/test"

const gatewayOrigin = "http://127.0.0.1:8797"
const png = readFileSync(
  new URL("../src/gallery/fixtures/demo-image-16-9.png", import.meta.url)
)

type Stop = { name: string; problem: string }

async function startDemoRun(app: string, prompt: string): Promise<void> {
  const started = await fetch(`${gatewayOrigin}/api/apps/${app}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: { prompt } }),
  })
  const body: { run: { id: string } } = await started.json()
  await expect
    .poll(async () => {
      const read = await fetch(`${gatewayOrigin}/api/runs/${body.run.id}`)
      const answer: { run: { status: string } } = await read.json()
      return answer.run.status
    })
    .toBe("done")
}

async function open(page: Page, path: string): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto(path)
  await page.waitForLoadState("networkidle")
}

type Edges = { left: number; top: number; right: number; bottom: number }

type Box = { slot: string; edges: Edges }

type Ring = {
  edges: Edges
  band: number
  inset: number
  color: string
}

type Seen = { isNew: boolean; name: string; ring: Ring | null }

type Boxes = { clips: ReadonlyArray<Box>; layers: ReadonlyArray<Box> }

async function readFocus(page: Page): Promise<Seen | null> {
  return await page.evaluate(() => {
    const focused = document.activeElement
    if (focused === null || focused === document.body) {
      return null
    }
    const isNew = !focused.hasAttribute("data-ring-walk")
    focused.setAttribute("data-ring-walk", "")
    const name = (focused.getAttribute("aria-label") ?? focused.textContent)
      ?.trim()
      .slice(0, 40)
    const drawn = (at: Element): boolean => {
      const style = getComputedStyle(at)
      return (
        style.outlineStyle !== "none" &&
        Number.parseFloat(style.outlineWidth) > 0
      )
    }
    let ringed: Element | null = focused
    while (ringed !== null && !drawn(ringed)) {
      ringed = ringed.parentElement
    }
    for (const host of document.querySelectorAll("[data-ring-host]")) {
      host.removeAttribute("data-ring-host")
    }
    if (ringed === null) {
      return { isNew, name: name ?? "", ring: null }
    }
    ringed.setAttribute("data-ring-host", "")
    const style = getComputedStyle(ringed)
    const band = Number.parseFloat(style.outlineWidth)
    const reach = Number.parseFloat(style.outlineOffset) + band
    const box = ringed.getBoundingClientRect()
    const edges = {
      left: box.left - reach,
      top: box.top - reach,
      right: box.right + reach,
      bottom: box.bottom + reach,
    }
    const inset = Number.parseFloat(style.borderTopLeftRadius) + reach + band
    const ring = { edges, band, inset, color: style.outlineColor }
    return { isNew, name: name ?? "", ring }
  })
}

async function readBoxes(page: Page): Promise<Boxes> {
  return await page.evaluate(() => {
    const host = document.querySelector("[data-ring-host]")
    const slotOf = (at: Element): string =>
      at.getAttribute("data-slot") ?? at.tagName
    const clips: Box[] = []
    const scrollers: DOMRect[] = []
    const inside: Element[] = []
    for (let at = host?.parentElement; at; at = at.parentElement) {
      const style = getComputedStyle(at)
      if (style.overflowX !== "visible" || style.overflowY !== "visible") {
        const box = at.getBoundingClientRect()
        const left = box.left + Number.parseFloat(style.borderLeftWidth)
        const top = box.top + Number.parseFloat(style.borderTopWidth)
        const right = left + at.clientWidth
        const bottom = top + at.clientHeight
        clips.push({ slot: slotOf(at), edges: { left, top, right, bottom } })
        scrollers.push(box)
        inside.push(at)
      }
    }
    const isLayer = (at: Element): boolean => {
      const style = getComputedStyle(at)
      return (
        ["absolute", "fixed", "sticky"].includes(style.position) &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        style.clipPath === "none"
      )
    }
    const layers: Box[] = []
    for (const at of document.querySelectorAll("#root *")) {
      const box = at.getBoundingClientRect()
      const isOverScroller = scrollers.some(
        (scroller, index) =>
          !inside[index]?.contains(at) &&
          box.left < scroller.right &&
          scroller.left < box.right &&
          box.top < scroller.bottom &&
          scroller.top < box.bottom
      )
      const isApart = host !== null && !at.contains(host) && !host.contains(at)
      if (box.width > 0 && box.height > 0 && isApart && isOverScroller) {
        if (isLayer(at)) {
          const { left, top, right, bottom } = box
          layers.push({ slot: slotOf(at), edges: { left, top, right, bottom } })
        }
      }
    }
    return { clips, layers }
  })
}

function cutSides(ring: Edges, edges: Edges): string[] {
  return [
    ring.left < edges.left - 0.5 ? "left" : "",
    ring.right > edges.right + 0.5 ? "right" : "",
    ring.top < edges.top - 0.5 ? "top" : "",
    ring.bottom > edges.bottom + 0.5 ? "bottom" : "",
  ].filter((side) => side !== "")
}

type Side = "left" | "right" | "top" | "bottom"

type Point = readonly [number, number]

function sidePoints(ring: Ring, side: Side, over: Edges): Point[] {
  const { edges, band, inset } = ring
  const points: Point[] = []
  const isRow = side === "top" || side === "bottom"
  const from = isRow
    ? Math.max(edges.left + inset, over.left)
    : Math.max(edges.top + inset, over.top)
  const to = isRow
    ? Math.min(edges.right - inset, over.right)
    : Math.min(edges.bottom - inset, over.bottom)
  const across = {
    left: edges.left + band / 2,
    right: edges.right - band / 2,
    top: edges.top + band / 2,
    bottom: edges.bottom - band / 2,
  }[side]
  const isInBand = isRow
    ? across > over.top && across < over.bottom
    : across > over.left && across < over.right
  for (let along = from; isInBand && along <= to; along += 2) {
    points.push(isRow ? [along, across] : [across, along])
  }
  return points
}

async function colorsAt(
  page: Page,
  points: ReadonlyArray<Point>
): Promise<string[]> {
  const size = page.viewportSize() ?? { width: 0, height: 0 }
  const clip = { x: 0, y: 0, width: size.width, height: size.height }
  const png = await page.screenshot({ clip, scale: "css" })
  return await page.evaluate(
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
        const [r, g, b] = context.getImageData(
          Math.floor(x),
          Math.floor(y),
          1,
          1
        ).data
        return `rgb(${r}, ${g}, ${b})`
      })
    },
    { data: png.toString("base64"), at: points }
  )
}

function channels(color: string): number[] {
  return (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
}

function isNear(color: string, wanted: string): boolean {
  const one = channels(color)
  const two = channels(wanted)
  const distance = Math.hypot(...one.map((value, at) => value - (two[at] ?? 0)))
  return distance < 70
}

async function coveredSides(
  page: Page,
  ring: Ring,
  over: Edges
): Promise<Side[]> {
  const sides: Side[] = ["left", "right", "top", "bottom"]
  const hidden: Side[] = []
  for (const side of sides) {
    const points = sidePoints(ring, side, over)
    if (points.length > 0) {
      const colors = await colorsAt(page, points)
      const seen = colors.filter((color) => isNear(color, ring.color))
      if (seen.length < colors.length * 0.85) {
        hidden.push(side)
      }
    }
  }
  return hidden
}

async function problemOf(page: Page, ring: Ring | null): Promise<string> {
  if (ring === null) {
    return "no ring"
  }
  const { clips, layers } = await readBoxes(page)
  const problems = clips
    .map(({ slot, edges }) => ({ slot, sides: cutSides(ring.edges, edges) }))
    .filter(({ sides }) => sides.length > 0)
    .map(({ slot, sides }) => `cut by ${slot} ${sides.join(",")}`)
  for (const { slot, edges } of layers) {
    const sides = await coveredSides(page, ring, edges)
    if (sides.length > 0) {
      problems.push(`under ${slot} ${sides.join(",")}`)
    }
  }
  return problems.join("; ")
}

async function walkStops(page: Page, most: number): Promise<Stop[]> {
  const start = page.url()
  const found: Stop[] = []
  for (let step = 0; step < most; step += 1) {
    await page.keyboard.press("Tab")
    expect(page.url(), "Tab never leaves the page").toBe(start)
    const seen = await readFocus(page)
    if (seen === null) {
      continue
    }
    if (!seen.isNew) {
      break
    }
    found.push({ name: seen.name, problem: await problemOf(page, seen.ring) })
  }
  return found
}

test.beforeAll(async () => {
  await fetch(`${gatewayOrigin}/api/assets`, {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: png,
  })
  await Promise.all([
    ...Array.from({ length: 12 }, (_, at) =>
      startDemoRun("image", `a red rose ${at}`)
    ),
    ...Array.from({ length: 4 }, (_, at) =>
      startDemoRun("video", `a boat on a lake ${at}`)
    ),
  ])
})

for (const path of ["/history", "/library", "/apps/image", "/apps/video"]) {
  test(`every Tab stop on ${path} draws its whole focus ring, cut by no clipping box and under no layer`, async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await open(page, path)
    const stops = await walkStops(page, 160)
    expect(stops.length).toBeGreaterThan(4)
    expect(stops.filter((stop) => stop.problem !== "")).toEqual([])
  })
}

test("Library's search field and its first-column tile start on the page title's 16 px gutter", async ({
  page,
}) => {
  await open(page, "/library")
  const tile = page
    .locator("[data-slot='canvas-scroll'] [data-slot='media-tile']")
    .first()
  await expect(tile).toBeVisible()
  const box = await tile.boundingBox()
  expect(box?.x).toBe(16)
  const search = page.getByRole("searchbox", { name: "Search your library" })
  if (await search.isVisible()) {
    expect((await search.boundingBox())?.x).toBe(16)
  }
})
