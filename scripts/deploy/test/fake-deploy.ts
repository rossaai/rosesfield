import { createHash } from "node:crypto"
import { readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  type Harness,
  type HarnessDeps,
  newHarness,
  runHarness,
  testFolder,
} from "./login-harness"

export type Called = {
  args: string[]
  home: string
  config: string
  ci: string | null
  accountVariables: Record<string, string>
  stdinHash: string | null
}

export type FakeSetup = Omit<HarnessDeps, "wrangler" | "fetch"> & {
  failOn?: string
  existing?: string
  fetch?: HarnessDeps["fetch"]
}

export type FakeRun = {
  harness: Harness
  calls: Called[]
  error: unknown
}

const fakeWrangler = fileURLToPath(new URL("fake-wrangler.ts", import.meta.url))

export const production = [
  "--login",
  "--domain",
  "rosesfield.com",
  "--judge",
  "--cap",
  "100",
]

export const sha256 = (text: string): string =>
  createHash("sha256").update(text).digest("hex")

export function callsIn(journal: string): Called[] {
  return readFileSync(journal, "utf8")
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => JSON.parse(line))
}

export function capGivenTo(calls: readonly Called[]): number | null {
  const deploy = calls.find(
    (call) => call.args[0] === "deploy" && call.args.includes("--env=judge")
  )
  const variable = deploy?.args.find((arg) =>
    arg.startsWith("SPEND_CAP_CREDITS:")
  )
  return variable === undefined ? null : Number(variable.split(":")[1])
}

export function workerFetch(harness: Harness, journal: string) {
  return async (url: string, init: RequestInit): Promise<Response> => {
    const { hostname, pathname } = new URL(url)
    if (!hostname.startsWith("rosesfield-judge.")) {
      return new Response(null, { status: 200 })
    }
    const auth = new Headers(init.headers).get("authorization")
    const isOwner = auth === `Bearer ${harness.secrets[1]}`
    if (pathname === "/api/runs") {
      return new Response(null, { status: isOwner ? 200 : 401 })
    }
    if (pathname === "/api/account") {
      const credits = capGivenTo(callsIn(journal))
      return Response.json(
        { account: { cap: credits === null ? null : { credits, left: 0 } } },
        { status: isOwner ? 200 : 401 }
      )
    }
    return new Response(null, { status: 200 })
  }
}

export async function deployWith(
  args: readonly string[],
  setup: FakeSetup = {}
): Promise<FakeRun> {
  const harness = newHarness()
  const folder = testFolder()
  const journal = join(folder, "journal.jsonl")
  writeFileSync(journal, "")
  let error: unknown = null
  try {
    const { failOn, existing, fetch, ...deps } = setup
    await runHarness(harness, args, {
      ...deps,
      wrangler: ["bun", fakeWrangler, journal, failOn ?? "", existing ?? ""],
      fetch: fetch ?? workerFetch(harness, journal),
    })
  } catch (caught) {
    error = caught
  }
  const calls = callsIn(journal)
  rmSync(folder, { recursive: true, force: true })
  return { harness, calls, error }
}
