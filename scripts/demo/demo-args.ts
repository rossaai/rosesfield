import { join } from "node:path"
import { fileURLToPath } from "node:url"

export type AppChoice = { appId: string; runId: string | null }

export type CaptureOptions = {
  url: string
  key: string
  runId: string | null
  apps: AppChoice[]
  isLive: boolean
  isPlanOnly: boolean
  budget: number
  out: string
}

export const siteUrl = "https://rosesfield.com"

export const defaultUrl = siteUrl

export const budgetCeiling = 200

export const takesFolder = fileURLToPath(new URL("./takes", import.meta.url))

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const appIdPattern = /^[a-z][a-z0-9-]{0,63}$/

export const captureUsage = [
  "bun run demo:capture [--url <address>] [--run <run id>] [--apps <app>[=<run id>],...] [--live] [--budget <credits>] [--out <folder>] [--plan]",
  "",
  `  DEMO_URL  the site to record, ${defaultUrl} by default. --url wins over it. demo:cut cuts the final video only from a take of ${siteUrl}`,
  "  DEMO_KEY  your Comfy key. It is typed into the masked key field and sent in a header, and never printed",
  "  --run     the Effects run the video opens on, the latest finished live Effects run by default",
  "  --apps    the apps that get a short clip, each with its kept run, effects by default",
  "  --live    starts one new Effects run from the inputs of --run, inside --budget",
  `  --budget  the credits the live runs may spend, ${budgetCeiling} at most and by default`,
  "  --out     the take folder, scripts/demo/takes/<time> by default",
  "  --plan    reads the site, chooses the runs, prints the plan, and records nothing",
].join("\n")

export function urlOf(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${value} is not a web address.\n\n${captureUsage}`)
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${value} is not a web address.\n\n${captureUsage}`)
  }
  return url.origin
}

function runIdOf(value: string): string {
  if (!uuidPattern.test(value)) {
    throw new Error(`${value} is not a run id.\n\n${captureUsage}`)
  }
  return value.toLowerCase()
}

function appsOf(value: string): AppChoice[] {
  return value.split(",").map((part) => {
    const [appId = "", runId] = part.trim().split("=")
    if (!appIdPattern.test(appId)) {
      throw new Error(`${appId} is not an app id.\n\n${captureUsage}`)
    }
    return { appId, runId: runId === undefined ? null : runIdOf(runId) }
  })
}

function budgetOf(value: string): number {
  const budget = Number(value)
  if (!Number.isFinite(budget) || budget <= 0 || budget > budgetCeiling) {
    throw new Error(
      `--budget takes a number of credits above 0 and at most ${budgetCeiling}.\n\n${captureUsage}`
    )
  }
  return budget
}

function stampOf(time: Date): string {
  return time.toISOString().replace(/[:.]/g, "-")
}

type Draft = Omit<CaptureOptions, "url" | "key" | "out"> & {
  url: string | null
  out: string | null
}

function optionOf(draft: Draft, arg: string, value: string | undefined): number {
  if (arg === "--live") {
    draft.isLive = true
    return 0
  }
  if (arg === "--plan") {
    draft.isPlanOnly = true
    return 0
  }
  if (value === undefined) {
    throw new Error(`${arg} is not an option.\n\n${captureUsage}`)
  }
  if (arg === "--url") {
    draft.url = urlOf(value)
  } else if (arg === "--run") {
    draft.runId = runIdOf(value)
  } else if (arg === "--apps") {
    draft.apps = appsOf(value)
  } else if (arg === "--budget") {
    draft.budget = budgetOf(value)
  } else if (arg === "--out") {
    draft.out = value
  } else {
    throw new Error(`${arg} is not an option.\n\n${captureUsage}`)
  }
  return 1
}

export function captureOptionsOf(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
  now: Date
): CaptureOptions {
  const draft: Draft = {
    url: null,
    runId: null,
    apps: [{ appId: "effects", runId: null }],
    isLive: false,
    isPlanOnly: false,
    budget: budgetCeiling,
    out: null,
  }
  for (let index = 0; index < args.length; index += 1) {
    index += optionOf(draft, args[index] ?? "", args[index + 1])
  }
  const key = (env.DEMO_KEY ?? "").trim()
  if (key === "") {
    throw new Error(
      `Set DEMO_KEY to your Comfy key. The video shows it typed into the masked key field.\n\n${captureUsage}`
    )
  }
  const envUrl = env.DEMO_URL
  return {
    ...draft,
    key,
    url:
      draft.url ??
      (envUrl === undefined || envUrl === "" ? defaultUrl : urlOf(envUrl)),
    out: draft.out ?? join(takesFolder, stampOf(now)),
  }
}
