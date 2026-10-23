import { join } from "node:path"
import type { BrowserContext, Locator, Page } from "@playwright/test"
import { exploreCopy } from "../../apps/platform/src/copy/explore.en"
import { libraryCopy } from "../../apps/platform/src/copy/library.en"
import type { SceneId, Window } from "./demo-manifest"

export type Clock = () => number

export type SceneAct = (page: Page, at: Clock) => Promise<Window[]>

export type Recorded = { id: SceneId; file: string; windows: Window[] }

const waitMs = 30_000

export async function hold(page: Page, seconds: number): Promise<void> {
  await page.waitForTimeout(seconds * 1000)
}

export async function recordPage<Result>(
  context: BrowserContext,
  folder: string,
  name: string,
  act: (page: Page, at: Clock) => Promise<Result>
): Promise<{ file: string; result: Result }> {
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
  const file = join("screens", `${name}.webm`)
  await video.saveAs(join(folder, file))
  return { file, result }
}

export async function recordWith<Result extends { windows: Window[] }>(
  context: BrowserContext,
  folder: string,
  id: SceneId,
  act: (page: Page, at: Clock) => Promise<Result>
): Promise<{ recorded: Recorded; result: Result }> {
  const { file, result } = await recordPage(context, folder, id, act)
  return { recorded: { id, file, windows: result.windows }, result }
}

export async function recordScene(
  context: BrowserContext,
  folder: string,
  id: SceneId,
  act: SceneAct
): Promise<Recorded> {
  const { recorded } = await recordWith(
    context,
    folder,
    id,
    async (page, at) => ({
      windows: await act(page, at),
    })
  )
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
  await bar
    .getByText(/credits$/)
    .first()
    .waitFor({ timeout: waitMs })
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

const sharePathPattern = /^\/share\/[A-Za-z0-9_-]{1,64}$/

export function shareLinkOf(href: string | null, site: string): string {
  let link: URL | null = null
  try {
    link = href === null ? null : new URL(href, site)
  } catch {
    link = null
  }
  if (
    link === null ||
    link.origin !== new URL(site).origin ||
    !sharePathPattern.test(link.pathname)
  ) {
    throw new Error(
      `The share dialog shows ${href ?? "no link"}, not a shared page of ${site}.`
    )
  }
  return link.href
}

async function openViewer(page: Page): Promise<Locator> {
  const tile = page
    .locator("main [data-slot='output-cell'] button[data-slot='media-tile']")
    .first()
  await tile.waitFor({ timeout: waitMs })
  await tile.click()
  const more = page.locator("[data-slot='viewer-more']:visible").first()
  await more.waitFor({ timeout: waitMs })
  return more
}

export async function shareScene(
  page: Page,
  at: Clock,
  share: { runId: string; site: string }
): Promise<{ windows: Window[]; url: string }> {
  await openBar(page, `/history/${share.runId}`)
  await shownResult(page)
  await hold(page, 1.5)
  const start = at()
  const more = await openViewer(page)
  await hold(page, 1.5)
  await more.click()
  await hold(page, 1)
  const title = exploreCopy["share.title"]
  await page.getByRole("menuitem", { name: title }).click()
  const open = page
    .getByRole("dialog", { name: title })
    .getByRole("link", { name: exploreCopy["share.link.open"] })
  await open.waitFor({ timeout: waitMs })
  const url = shareLinkOf(await open.getAttribute("href"), share.site)
  await hold(page, 3.5)
  const dialog = { start, end: at() }
  await page.goto(new URL(url).pathname)
  await shownResult(page)
  const shown = at()
  await hold(page, 4)
  return { windows: [dialog, { start: shown, end: at() }], url }
}

async function runModelOf(page: Page, runId: string): Promise<string | null> {
  await openBar(page, `/history/${runId}`)
  await shownResult(page)
  const label = libraryCopy["viewer.label.model"].replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  )
  const row = page
    .locator("main dl > div")
    .filter({ has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) })
    .locator("dd")
    .first()
  if ((await row.count()) === 0) {
    return null
  }
  const model = (await row.textContent())?.trim() ?? ""
  return model === "" ? null : model
}

export const appScreenSeconds = 4.5

export async function appScreenScene(
  page: Page,
  at: Clock,
  run: { appId: string; id: string }
): Promise<{ windows: Window[]; model: string | null }> {
  await openBar(page, `/apps/${run.appId}?from=${run.id}`)
  await page.locator("main").first().waitFor({ timeout: waitMs })
  await hold(page, 2.5)
  const start = at()
  await hold(page, appScreenSeconds)
  const windows = [{ start, end: at() }]
  return { windows, model: await runModelOf(page, run.id) }
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
  await page
    .getByText(/credits$/)
    .last()
    .scrollIntoViewIfNeeded()
  await hold(page, 2.5)
  await bar
    .getByText(/credits$/)
    .first()
    .click()
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
