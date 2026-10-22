import type { Page } from "@playwright/test"
import { checkLiveRun, priceIn } from "./demo-budget"
import type { DemoHost, HostRun } from "./demo-host"
import type { Window } from "./demo-manifest"
import { type Clock, hold, openBar } from "./demo-scenes"

export type LiveResult = { windows: Window[]; run: HostRun; credits: number }

const pollMs = 5000
const arrivalMs = 15 * 60_000
const endedStatuses: readonly string[] = ["failed", "cancelled"]

async function arrival(
  host: DemoHost,
  appId: string,
  before: ReadonlySet<string>
): Promise<HostRun> {
  const deadline = Date.now() + arrivalMs
  while (Date.now() < deadline) {
    const made = (await host.runs(appId)).find((run) => !before.has(run.id))
    if (made !== undefined && made.status === "done") {
      return made
    }
    if (made !== undefined && endedStatuses.includes(made.status)) {
      throw new Error(`The live run ${made.id} ended ${made.status}.`)
    }
    await Bun.sleep(pollMs)
  }
  throw new Error(
    `The live ${appId} run did not finish in ${arrivalMs / 60_000} minutes.`
  )
}

export async function liveRunScene(
  page: Page,
  at: Clock,
  options: { host: DemoHost; from: HostRun; left: number }
): Promise<LiveResult> {
  const { host, from } = options
  await openBar(page, `/apps/${from.appId}?from=${from.id}`)
  const generate = page.locator("[data-slot='generate-button']").first()
  const price = generate.locator("[data-slot='generate-button-price']")
  await price.waitFor({ timeout: 30_000 })
  await hold(page, 1.5)
  const estimate = checkLiveRun(
    priceIn((await price.textContent()) ?? ""),
    options.left
  )
  const before = new Set((await host.runs(from.appId)).map((run) => run.id))
  const start = at()
  await generate.click()
  await hold(page, 3)
  const started = { start, end: at() }
  const run = await arrival(host, from.appId, before)
  const arrived = at()
  await hold(page, 5)
  return {
    windows: [
      started,
      { start: Math.max(started.end, arrived - 2), end: at() },
    ],
    run,
    credits: run.credits ?? estimate,
  }
}
