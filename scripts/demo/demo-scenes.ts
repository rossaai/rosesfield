import { join } from "node:path"
import type { BrowserContext, Locator, Page } from "@playwright/test"
import { rowOf } from "./demo-host"
import type { SceneId, Window } from "./demo-manifest"

export type Clock = () => number

export type SceneAct = (page: Page, at: Clock) => Promise<Window[]>

export type Recorded = { id: SceneId; file: string; windows: Window[] }

const waitMs = 30_000

export async function hold(page: Page, seconds: number): Promise<void> {
  await page.waitForTimeout(seconds * 1000)
}

export async function recordWith<Result extends { windows: Window[] }>(
  context: BrowserContext,
  folder: string,
  id: SceneId,
  act: (page: Page, at: Clock) => Promise<Result>
): Promise<{ recorded: Recorded; result: Result }> {
  const page = await context.newPage()
  const started = Date.now()
  const video = page.video()
  if (video === null) {
    await page.close()
    throw new Error("The browser records no video for this page.")
  }
  let result: Result
  try {
    result = await act(page, () => (Date.now() - started) / 1000)
  } finally {
    await page.close()
  }
  const file = join("screens", `${id}.webm`)
  await video.saveAs(join(folder, file))
  return { recorded: { id, file, windows: result.windows }, result }
}

export async function recordScene(
  context: BrowserContext,
  folder: string,
  id: SceneId,
  act: SceneAct
): Promise<Recorded> {
  const { recorded } = await recordWith(context, folder, id, async (page, at) => ({
    windows: await act(page, at),
  }))
  return recorded
}

export async function openBar(page: Page, path: string): Promise<Locator> {
  await page.goto(path)
  const bar = page.locator("header[data-slot='app-bar']")
  await bar.waitFor({ timeout: waitMs })
  return bar
}

export async function slowScroll(page: Page, seconds: number): Promise<void> {
  const steps = Math.max(1, Math.floor(seconds / 1.5))
  for (let step = 0; step < steps; step += 1) {
    await page.mouse.wheel(0, 240)
    await hold(page, seconds / steps)
  }
}

export async function shownResult(page: Page): Promise<void> {
  await page
    .locator("main video, main img")
    .first()
    .waitFor({ timeout: waitMs })
}

export async function keyScene(
  page: Page,
  at: Clock,
  key: string
): Promise<Window[]> {
  const bar = await openBar(page, "/")
  await hold(page, 1)
  const start = at()
  await bar.getByRole("button", { name: "Connect", exact: true }).click()
  const dialog = page.getByRole("dialog")
  const field = dialog.locator("input[type='password']")
  await field.waitFor({ timeout: waitMs })
  await hold(page, 1.5)
  await field.fill(key)
  await hold(page, 1)
  await dialog.getByRole("button", { name: "Add key" }).click()
  await bar.getByText(/credits$/).first().waitFor({ timeout: waitMs })
  await hold(page, 3)
  await page.keyboard.press("Escape")
  await hold(page, 1)
  return [{ start, end: at() }]
}

export async function areasScene(page: Page, at: Clock): Promise<Window[]> {
  const bar = await openBar(page, "/")
  await hold(page, 1)
  const start = at()
  const areas = bar.locator("[data-slot='app-bar-areas']")
  if ((await areas.count()) < 4) {
    throw new Error("The top bar lists fewer than three areas after Explore.")
  }
  for (const index of [1, 2, 3]) {
    await areas.nth(index).click()
    await hold(page, 2.5)
  }
  return [{ start, end: at() }]
}

export async function modelListScene(
  page: Page,
  at: Clock,
  path: string,
  seconds: number
): Promise<Window[]> {
  await openBar(page, path)
  const trigger = page.getByRole("button", { name: /^Model/ }).first()
  await trigger.waitFor({ timeout: waitMs })
  await hold(page, 1)
  const start = at()
  await trigger.click()
  const list = page.getByRole("listbox")
  await list
    .locator("[data-slot='model-row-price']")
    .first()
    .waitFor({ timeout: waitMs })
  await hold(page, 1.5)
  await list.hover()
  await slowScroll(page, seconds)
  await page.keyboard.press("Escape")
  await hold(page, 0.5)
  return [{ start, end: at() }]
}

export async function storedRunScene(
  page: Page,
  at: Clock,
  runId: string
): Promise<Window[]> {
  await openBar(page, "/history")
  await page.locator("main h1").first().waitFor({ timeout: waitMs })
  await hold(page, 1)
  const start = at()
  const link = page.locator(`main a[href$='/history/${runId}']`).first()
  if ((await link.count()) > 0) {
    await link.scrollIntoViewIfNeeded()
    await hold(page, 1)
    await link.click()
  } else {
    await page.goto(`/history/${runId}`)
  }
  await shownResult(page)
  await hold(page, 6)
  return [{ start, end: at() }]
}

function sharePathOf(body: unknown): string {
  const path = rowOf(rowOf(body).share).path
  if (typeof path !== "string" || path === "") {
    throw new Error("Share answered with no link.")
  }
  return path
}

export async function shareScene(
  page: Page,
  at: Clock,
  run: { id: string; appName: string }
): Promise<{ windows: Window[]; path: string }> {
  await openBar(page, "/")
  const more = page
    .getByRole("button", { name: `More for this ${run.appName} result` })
    .first()
  await more.waitFor({ timeout: waitMs })
  await more.scrollIntoViewIfNeeded()
  await hold(page, 1.5)
  const start = at()
  const answered = page.waitForResponse(
    (response) =>
      /^\/api\/runs\/[^/]+\/share$/.test(new URL(response.url()).pathname),
    { timeout: waitMs }
  )
  await more.click()
  const response = await answered
  if (!new URL(response.url()).pathname.includes(run.id)) {
    throw new Error(
      `Explore's first ${run.appName} result is another run than ${run.id}. Name that run with --run, or make ${run.id} the latest.`
    )
  }
  const path = sharePathOf(await response.json())
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Open the page" })
    .waitFor({ timeout: waitMs })
  await hold(page, 4)
  await page.keyboard.press("Escape")
  await hold(page, 0.5)
  return { windows: [{ start, end: at() }], path }
}

export async function creditsScene(
  page: Page,
  at: Clock,
  runId: string
): Promise<Window[]> {
  const bar = await openBar(page, `/history/${runId}`)
  await shownResult(page)
  await hold(page, 1)
  const start = at()
  await page.getByText(/credits$/).last().scrollIntoViewIfNeeded()
  await hold(page, 2.5)
  await bar.getByText(/credits$/).first().click()
  await hold(page, 3)
  await page.keyboard.press("Escape")
  await hold(page, 0.5)
  return [{ start, end: at() }]
}

export async function pageScene(
  page: Page,
  at: Clock,
  path: string,
  seconds: number
): Promise<Window[]> {
  await openBar(page, path)
  await page.locator("main").first().waitFor({ timeout: waitMs })
  await hold(page, 1.5)
  const start = at()
  await slowScroll(page, seconds)
  return [{ start, end: at() }]
}

export async function graphScene(
  page: Page,
  at: Clock,
  options: { runId: string; graph: string; seconds: number }
): Promise<Window[]> {
  await openBar(page, `/history/${options.runId}`)
  await shownResult(page)
  await hold(page, 1)
  const start = at()
  await page
    .getByText(options.graph, { exact: true })
    .first()
    .scrollIntoViewIfNeeded()
  await hold(page, options.seconds)
  return [{ start, end: at() }]
}
