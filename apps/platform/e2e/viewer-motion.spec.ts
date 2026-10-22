import { expect, type Locator, type Page, test } from "@playwright/test"

const tolerance = 2

type Box = { x: number; y: number; width: number; height: number }

type Done = { run: { status: string; outputs: string[] } }

function gatewayOrigin(): string {
  const origin = test.info().config.metadata.gatewayOrigin
  if (typeof origin !== "string") {
    throw new Error("the Playwright config names no gateway origin")
  }
  return origin
}

async function startDemo(app: string, inputs: object): Promise<string> {
  const started = await fetch(`${gatewayOrigin()}/api/apps/${app}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs }),
  })
  const body: { run: { id: string } } = await started.json()
  await expect
    .poll(async () => {
      const read = await fetch(`${gatewayOrigin()}/api/runs/${body.run.id}`)
      const answer: Done = await read.json()
      return answer.run.status
    })
    .toBe("done")
  return body.run.id
}

let imageRun = ""

test.beforeAll(async () => {
  imageRun = await startDemo("image", {
    model: "z-image-turbo",
    prompt: "a paper boat on a pond",
    resolution: "1k",
  })
  await startDemo("video", {
    model: "minimax/minimax-h3",
    prompt: "a paper boat drifts on a pond",
    ratio: "16:9",
    resolution: "768P",
    duration: 5,
  })
})

async function open(page: Page, path: string): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto(path)
  await page.waitForLoadState("networkidle")
}

function tileOn(page: Page): Locator {
  return page
    .locator(
      "button[data-slot='media-tile']:visible, [data-slot='media'] [data-cover]:visible"
    )
    .first()
}

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.evaluate((element) => {
    const holder = element.closest("[data-slot='media']") ?? element
    const rect = holder.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })
  return box
}

async function holdFrameMotion(page: Page): Promise<void> {
  await page.evaluate(() => {
    const held = window as unknown as {
      heldFrame: Animation | null
      heldShape: number
    }
    held.heldFrame = null
    held.heldShape = 0
    const original = Element.prototype.animate
    Element.prototype.animate = function animate(keyframes, options) {
      const running = original.call(this, keyframes, options)
      if (this instanceof HTMLElement && this.dataset.slot === "viewer-frame") {
        running.pause()
        held.heldFrame = running
        held.heldShape = this.offsetWidth / this.offsetHeight
      }
      return running
    }
  })
}

async function frameBoxAt(page: Page, moment: "start" | "end"): Promise<Box> {
  await page.waitForFunction(
    () =>
      (window as unknown as { heldFrame: Animation | null }).heldFrame !== null
  )
  return page.evaluate((at) => {
    const held = window as unknown as { heldFrame: Animation | null }
    const running = held.heldFrame
    const frame = document.querySelector<HTMLElement>(
      "[data-slot='viewer-frame']"
    )
    if (running === null || frame === null) {
      throw new Error("the viewer frame has no motion")
    }
    const end = Number(running.effect?.getComputedTiming().endTime ?? 0)
    running.currentTime = at === "start" ? 0 : end
    const rect = frame.getBoundingClientRect()
    const style = getComputedStyle(frame)
    const scale =
      style.transform === "none" ? 1 : new DOMMatrix(style.transform).a
    const inset = /inset\(([^)]*)\)/.exec(style.clipPath)?.[1] ?? "0px"
    const sides = inset
      .split(" round ")[0]
      ?.trim()
      .split(/\s+/)
      .map((side) => Number.parseFloat(side)) ?? [0]
    const [top = 0, right = top, bottom = top, left = right] = sides
    return {
      x: rect.x + left * scale,
      y: rect.y + top * scale,
      width: rect.width - (left + right) * scale,
      height: rect.height - (top + bottom) * scale,
    }
  }, moment)
}

async function release(page: Page): Promise<void> {
  await page.evaluate(() => {
    const held = window as unknown as { heldFrame: Animation | null }
    held.heldFrame?.play()
    held.heldFrame = null
  })
}

function expectSameBox(actual: Box, expected: Box): void {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.width - expected.width)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.height - expected.height)).toBeLessThanOrEqual(
    tolerance
  )
}

async function expectGrowsFromTile(page: Page, path: string): Promise<void> {
  await open(page, path)
  const tile = tileOn(page)
  await expect(tile).toBeVisible()
  await tile.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  const from = await boxOf(tile)
  await holdFrameMotion(page)
  await tile.click()
  expectSameBox(await frameBoxAt(page, "start"), from)
  await release(page)
  await page.waitForTimeout(800)
  await page.keyboard.press("Escape")
  expectSameBox(await frameBoxAt(page, "end"), from)
  await release(page)
  await expect(page.locator("[data-slot='viewer-frame']")).toHaveCount(0)
}

test("the viewer grows out of a Library tile and shrinks back into it", async ({
  page,
}) => {
  await expectGrowsFromTile(page, "/library")
})

test("the viewer grows out of a result on a History run and shrinks back into it", async ({
  page,
}) => {
  await expectGrowsFromTile(page, `/history/${imageRun}`)
})

test("the viewer grows out of a past run on an app page and shrinks back into it", async ({
  page,
}) => {
  await expectGrowsFromTile(page, "/apps/image")
})

async function uploadTallImage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas")
    canvas.width = 90
    canvas.height = 160
    const context = canvas.getContext("2d")
    if (context === null) {
      throw new Error("the canvas has no 2d context")
    }
    context.fillStyle = "#3a7d44"
    context.fillRect(0, 0, 90, 160)
    const blob = await new Promise<Blob | null>((done) =>
      canvas.toBlob(done, "image/png")
    )
    if (blob === null) {
      throw new Error("the canvas made no image")
    }
    const sent = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: blob,
    })
    if (!sent.ok) {
      throw new Error(`the upload answered ${sent.status}`)
    }
  })
}

async function frameShape(page: Page): Promise<number> {
  return page
    .locator("[data-slot='viewer-frame']")
    .evaluate((frame: HTMLElement) => frame.offsetWidth / frame.offsetHeight)
}

test("the viewer opens at the shape of a tall upload whose size is not stored, so the frame never reshapes", async ({
  page,
}) => {
  await open(page, "/library")
  await uploadTallImage(page)
  await page.reload()
  await page.waitForLoadState("networkidle")
  const tile = tileOn(page)
  await expect(tile).toBeVisible()
  await expect
    .poll(() =>
      tile.evaluate(
        (element) => element.querySelector("img")?.naturalHeight ?? 0
      )
    )
    .toBe(160)
  await holdFrameMotion(page)
  await tile.click()
  await frameBoxAt(page, "start")
  const first = await page.evaluate(
    () => (window as unknown as { heldShape: number }).heldShape
  )
  await release(page)
  await expect(page.locator("[data-slot='viewer-frame'] img")).toBeVisible()
  await page.waitForTimeout(800)

  expect(first).toBeCloseTo(90 / 160, 2)
  expect(await frameShape(page)).toBeCloseTo(first, 2)
})

test("with reduced motion the viewer's first frame is its settled box, and it fades", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await open(page, "/library")
  const tile = tileOn(page)
  await expect(tile).toBeVisible()
  await holdFrameMotion(page)
  await tile.click()
  const first = await frameBoxAt(page, "start")
  const tracks = await page.evaluate(() => {
    const held = window as unknown as { heldFrame: Animation | null }
    const effect = held.heldFrame?.effect
    return effect instanceof KeyframeEffect
      ? effect.getKeyframes().flatMap((frame) => Object.keys(frame))
      : []
  })
  await release(page)
  await page.waitForTimeout(800)
  const settled = await page
    .locator("[data-slot='viewer-frame']")
    .evaluate((frame) => {
      const rect = frame.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    })

  expect(tracks).toContain("opacity")
  expect(tracks).not.toContain("transform")
  expectSameBox(first, settled)
})
