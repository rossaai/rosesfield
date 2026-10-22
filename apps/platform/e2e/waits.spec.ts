import { readFileSync } from "node:fs"
import { expect, type Page, test } from "@playwright/test"

const gatewayOrigin = "http://127.0.0.1:8797"

type WaitId = "result" | "video" | "catalog"

const boundRow = /^\| `(result|video|catalog)` \|.*\| ([\d,]+) ms \|$/gm
const demoDelay = /static readonly delayMs = ([\d_]+)/

function boundsOf(doc: string): Record<WaitId, number> {
  const found = new Map<string, number>()
  for (const match of doc.matchAll(boundRow)) {
    const [, id, ms] = match
    if (id !== undefined && ms !== undefined) {
      found.set(id, Number(ms.replaceAll(",", "")))
    }
  }
  const bound = (id: WaitId): number => {
    const ms = found.get(id)
    if (ms === undefined) {
      throw new Error(`docs/waits.md holds no bound for the ${id} wait`)
    }
    return ms
  }
  return {
    result: bound("result"),
    video: bound("video"),
    catalog: bound("catalog"),
  }
}

function demoDelayOf(source: string): number {
  const ms = demoDelay.exec(source)?.[1]
  if (ms === undefined) {
    throw new Error("the demo engine declares no delayMs")
  }
  return Number(ms.replaceAll("_", ""))
}

const bounds = boundsOf(
  readFileSync(new URL("../../../docs/waits.md", import.meta.url), "utf8")
)

const demoDelayMs = demoDelayOf(
  readFileSync(
    new URL(
      "../../../packages/generation/src/infrastructure/demo-generation-engine.ts",
      import.meta.url
    ),
    "utf8"
  )
)

function report(id: WaitId, ms: number): void {
  const rounded = Math.round(ms)
  console.log(`wait ${id}: ${rounded} ms, bound ${bounds[id]} ms`)
  test.info().annotations.push({
    type: `wait ${id}`,
    description: `${rounded} ms, bound ${bounds[id]} ms`,
  })
  expect(rounded, `the ${id} wait passes its bound`).toBeLessThanOrEqual(
    bounds[id]
  )
}

async function open(page: Page, path: string): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto(path)
  await page.waitForLoadState("networkidle")
}

async function markNextClick(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.addEventListener(
      "click",
      (event) => {
        Reflect.set(window, "waitsClickedAt", event.timeStamp)
      },
      { capture: true, once: true }
    )
  })
}

async function startDemoVideo(): Promise<string> {
  const started = await fetch(`${gatewayOrigin}/api/apps/video/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inputs: {
        model: "minimax/minimax-h3",
        prompt: "a paper boat drifts on a pond",
        ratio: "16:9",
        resolution: "768P",
        duration: 5,
      },
    }),
  })
  const body: { run: { id: string } } = await started.json()
  await expect
    .poll(
      async () => {
        const read = await fetch(`${gatewayOrigin}/api/runs/${body.run.id}`)
        const answer: { run: { status: string } } = await read.json()
        return answer.run.status
      },
      { timeout: 20_000 }
    )
    .toBe("done")
  return body.run.id
}

const chipName =
  '[data-slot="model-row"][data-place="trigger"] [data-slot="model-row-name"]'

test.describe("the three waits on the demo engine", () => {
  test.skip(({ isMobile }) => isMobile, "the waits are read at 1440 px")

  test("paints a finished result within its bound of the engine's done", async ({
    page,
  }) => {
    await open(page, "/apps/image")
    const bar = page.locator('[data-bar="prompt"]')
    await bar
      .getByRole("textbox", { name: "Prompt" })
      .fill("a paper boat on a still pond")
    const started = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/apps/image/runs"
    )
    await bar.locator('[data-slot="generate-button"]').click()
    const answer: { run: { createdAt: string } } = await (
      await started
    ).json()
    const engineDoneAt = Date.parse(answer.run.createdAt) + demoDelayMs
    const run = page.locator('[data-slot="app-stage-scroll"] article').first()
    await expect(
      run.locator('[data-slot="working-pulse"]').first()
    ).toBeVisible()
    const painted = await page.waitForFunction(
      () => {
        const image = document.querySelector<HTMLImageElement>(
          '[data-slot="app-stage-scroll"] article img'
        )
        return image !== null && image.complete && image.naturalWidth > 0
          ? Date.now()
          : false
      },
      null,
      { polling: "raf", timeout: 30_000 }
    )
    const paintedAt = Number(await painted.jsonValue())
    report("result", paintedAt - engineDoneAt)
  })

  test("shows a video's first frame within its bound of opening it", async ({
    page,
  }) => {
    const runId = await startDemoVideo()
    await open(page, `/history/${runId}`)
    const tile = page
      .locator(
        "button[data-slot='media-tile']:visible, [data-slot='media'] [data-cover]:visible"
      )
      .first()
    await expect(tile).toBeVisible()
    await tile.scrollIntoViewIfNeeded()
    await markNextClick(page)
    await tile.click()
    const shown = await page.waitForFunction(
      () => {
        const clickedAt = Reflect.get(window, "waitsClickedAt")
        const video = document.querySelector<HTMLVideoElement>(
          "[data-slot=viewer-video] video"
        )
        return typeof clickedAt === "number" &&
          video !== null &&
          video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
          ? performance.now() - clickedAt
          : false
      },
      null,
      { polling: "raf", timeout: 30_000 }
    )
    report("video", Number(await shown.jsonValue()))
  })

  test("shows an app's catalog within its bound of opening the app", async ({
    page,
  }) => {
    await open(page, "/apps/image")
    const imageChip = page.locator(chipName).filter({ visible: true }).first()
    await expect(imageChip).not.toHaveText("Model")
    const imageName = (await imageChip.textContent()) ?? ""
    await page
      .locator("header[data-slot='app-bar']")
      .getByRole("button", { name: "Video", exact: true })
      .click()
    const link = page
      .locator("[data-slot='app-bar-areaMenu']")
      .locator('a[href="/apps/video"]')
    await expect(link).toBeVisible()
    await markNextClick(page)
    await link.click()
    const listed = await page.waitForFunction(
      ({ selector, before }) => {
        const clickedAt = Reflect.get(window, "waitsClickedAt")
        const chip = [...document.querySelectorAll(selector)].find((one) =>
          one.checkVisibility()
        )
        const name = chip?.textContent ?? ""
        return typeof clickedAt === "number" &&
          window.location.pathname === "/apps/video" &&
          name !== "" &&
          name !== "Model" &&
          name !== before
          ? performance.now() - clickedAt
          : false
      },
      { selector: chipName, before: imageName },
      { polling: "raf", timeout: 30_000 }
    )
    report("catalog", Number(await listed.jsonValue()))
  })
})
