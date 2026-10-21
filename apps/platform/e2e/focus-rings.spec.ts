import { readFileSync } from "node:fs"
import { expect, type Page, test } from "@playwright/test"

const gatewayOrigin = "http://127.0.0.1:8797"
const png = readFileSync(
  new URL("../src/gallery/fixtures/demo-image-16-9.png", import.meta.url)
)

type Stop = { name: string; problem: string }

async function startDemoRun(): Promise<void> {
  const started = await fetch(`${gatewayOrigin}/api/apps/image/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: { prompt: "a red rose" } }),
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

type Seen = {
  isNew: boolean
  name: string
  ring: Edges | null
  clips: ReadonlyArray<{ slot: string; edges: Edges }>
}

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
    const clips: Array<{ slot: string; edges: Edges }> = []
    for (let at = ringed?.parentElement; at; at = at.parentElement) {
      const style = getComputedStyle(at)
      if (style.overflowX !== "visible" || style.overflowY !== "visible") {
        const box = at.getBoundingClientRect()
        const left = box.left + Number.parseFloat(style.borderLeftWidth)
        const top = box.top + Number.parseFloat(style.borderTopWidth)
        const right = left + at.clientWidth
        const bottom = top + at.clientHeight
        const slot = at.getAttribute("data-slot") ?? at.tagName
        clips.push({ slot, edges: { left, top, right, bottom } })
      }
    }
    if (ringed === null) {
      return { isNew, name: name ?? "", ring: null, clips }
    }
    const style = getComputedStyle(ringed)
    const reach =
      Number.parseFloat(style.outlineOffset) +
      Number.parseFloat(style.outlineWidth)
    const box = ringed.getBoundingClientRect()
    const ring = {
      left: box.left - reach,
      top: box.top - reach,
      right: box.right + reach,
      bottom: box.bottom + reach,
    }
    return { isNew, name: name ?? "", ring, clips }
  })
}

function problemOf(seen: Seen): string {
  const { ring } = seen
  if (ring === null) {
    return "no ring"
  }
  return seen.clips
    .map(({ slot, edges }) => {
      const sides = [
        ring.left < edges.left - 0.5 ? "left" : "",
        ring.right > edges.right + 0.5 ? "right" : "",
        ring.top < edges.top - 0.5 ? "top" : "",
        ring.bottom > edges.bottom + 0.5 ? "bottom" : "",
      ].filter((side) => side !== "")
      return sides.length === 0 ? "" : `${slot} ${sides.join(",")}`
    })
    .filter((cut) => cut !== "")
    .join("; ")
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
    found.push({ name: seen.name, problem: problemOf(seen) })
  }
  return found
}

test.beforeAll(async () => {
  await fetch(`${gatewayOrigin}/api/assets`, {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: png,
  })
  await startDemoRun()
})

for (const path of ["/history", "/library", "/apps/image", "/apps/video"]) {
  test(`every Tab stop on ${path} draws its whole focus ring, cut by no clipping box`, async ({
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
