import { createHash } from "node:crypto"
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"
import { deployTargets, gatewayRoot } from "../deploy-targets"
import {
  countIn,
  type Harness,
  newHarness,
  runHarness,
  testFolder,
} from "./login-harness"

type Called = {
  args: string[]
  home: string
  config: string
  ci: string | null
  stdinHash: string | null
}

const fakeWrangler = fileURLToPath(new URL("fake-wrangler.ts", import.meta.url))
const scratch: string[] = []

afterEach(() => {
  for (const folder of scratch.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

function journalFile(): string {
  const folder = testFolder()
  scratch.push(folder)
  const journal = join(folder, "journal.jsonl")
  writeFileSync(journal, "")
  return journal
}

function callsIn(journal: string): Called[] {
  return readFileSync(journal, "utf8")
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => JSON.parse(line))
}

function fetchFor(harness: Harness) {
  return async (url: string, init: RequestInit): Promise<Response> => {
    const { hostname, pathname } = new URL(url)
    const auth = new Headers(init.headers).get("authorization")
    if (hostname.startsWith("rosesfield-judge.") && pathname === "/api/runs") {
      const isOwner = auth === `Bearer ${harness.secrets[1]}`
      return new Response(null, { status: isOwner ? 200 : 401 })
    }
    return new Response(null, { status: 200 })
  }
}

async function deployWith(
  args: string[],
  setup: { failOn?: string; existing?: string; loginFails?: boolean } = {}
): Promise<{ harness: Harness; calls: Called[]; error: unknown }> {
  const harness = newHarness()
  const journal = journalFile()
  let error: unknown = null
  try {
    await runHarness(harness, args, {
      wrangler: [
        "bun",
        fakeWrangler,
        journal,
        setup.failOn ?? "",
        setup.existing ?? "",
      ],
      fetch: fetchFor(harness),
      loginFails: setup.loginFails === true,
    })
  } catch (caught) {
    error = caught
  }
  return { harness, calls: callsIn(journal), error }
}

const sha256 = (text: string): string =>
  createHash("sha256").update(text).digest("hex")

const production = [
  "--login",
  "--domain",
  "rosesfield.com",
  "--judge",
  "--cap",
  "100",
]

describe("bun run deploy --login", () => {
  it("runs every wrangler call in its own folder and creates what is missing", async () => {
    const { harness, calls, error } = await deployWith(production)
    expect(error).toBeNull()
    const [folder] = harness.folders
    expect(calls.map((call) => call.args.slice(0, 3).join(" "))).toEqual([
      "whoami --env-file " + join(folder ?? "", "none.env"),
      "r2 bucket info",
      "r2 bucket create",
      "d1 info rosesfield",
      "d1 create rosesfield",
      "d1 migrations apply",
      "secret list --env=",
      "secret put SESSION_SECRET",
      "deploy --env= --domain",
      "r2 bucket info",
      "r2 bucket create",
      "d1 info rosesfield-judge",
      "d1 create rosesfield-judge",
      "d1 migrations apply",
      "secret list --env=judge",
      "secret put OWNER_TOKEN",
      "secret list --env=judge",
      "secret put COMFY_API_KEY",
      "deploy --env=judge --var",
    ])
    for (const call of calls) {
      expect(call.home).toBe(join(folder ?? "", "home"))
      expect(call.config).toBe(join(folder ?? "", "config"))
    }
    expect(calls.at(-1)?.args).toContain("SPEND_CAP_CREDITS:100")
    expect(harness.logins).toBe(1)
    expect(harness.logouts).toBe(1)
    expect(existsSync(folder ?? "")).toBe(false)
  })

  it("skips the bucket, the database and the secrets that exist", async () => {
    const { harness, calls, error } = await deployWith(production, {
      existing: "r2,d1,secrets",
    })
    expect(error).toBeNull()
    const made = calls.filter((call) =>
      ["create", "put"].includes(
        call.args[1] === "bucket" ? (call.args[2] ?? "") : (call.args[1] ?? "")
      )
    )
    expect(made).toEqual([])
    expect(harness.secrets).toEqual([])
    expect(harness.output.join("")).toContain(
      "#token=<the OWNER_TOKEN set before>"
    )
  })

  it("hands each secret to wrangler on stdin and never prints or stores it", async () => {
    const { harness, calls, error } = await deployWith(production)
    expect(error).toBeNull()
    const [sessionSecret = "", ownerToken = ""] = harness.secrets
    expect(sessionSecret).toMatch(/^[0-9a-f]{64}$/)
    const put = (name: string) =>
      calls.find((call) => call.args[1] === "put" && call.args[2] === name)
    expect(put("SESSION_SECRET")?.stdinHash).toBe(sha256(sessionSecret))
    expect(put("OWNER_TOKEN")?.stdinHash).toBe(sha256(ownerToken))
    expect(put("COMFY_API_KEY")?.stdinHash).toBe(sha256(harness.typedKey))
    expect(put("COMFY_API_KEY")?.ci).toBeNull()
    const output = harness.output.join("")
    expect(countIn(output, sessionSecret)).toBe(0)
    expect(countIn(output, harness.typedKey)).toBe(0)
    expect(countIn(output, ownerToken)).toBe(1)
    expect(output).toContain(
      `The owner link, printed once: https://rosesfield-judge.fake-account.workers.dev/#token=${ownerToken}`
    )
    const argv = calls.flatMap((call) => call.args).join(" ")
    expect(argv).not.toContain(sessionSecret)
    expect(argv).not.toContain(ownerToken)
    expect(harness.leaks).toEqual([])
    const journal = JSON.stringify(calls)
    expect(journal).not.toContain(sessionSecret)
  })

  it("signs out and deletes the folder when a step fails", async () => {
    const { harness, error } = await deployWith(production, {
      failOn: "deploy",
    })
    expect(error).toBeInstanceOf(Error)
    expect(harness.logouts).toBe(1)
    expect(harness.folders).toHaveLength(1)
    expect(existsSync(harness.folders[0] ?? "")).toBe(false)
    expect(harness.output.join("")).not.toContain("The owner link")
  })

  it("signs out and deletes the folder when the sign-in fails", async () => {
    const { harness, calls, error } = await deployWith(production, {
      loginFails: true,
    })
    expect(error).toBeInstanceOf(Error)
    expect(calls).toEqual([])
    expect(harness.logouts).toBe(1)
    expect(existsSync(harness.folders[0] ?? "")).toBe(false)
  })

  it("prints every step on a dry run and runs none", async () => {
    const { harness, calls, error } = await deployWith([
      ...production,
      "--dry-run",
    ])
    expect(error).toBeNull()
    expect(calls).toEqual([])
    expect(harness.folders).toEqual([])
    const output = harness.output.join("")
    expect(output).toContain("wrangler login")
    expect(output).toContain("wrangler deploy --env= --domain rosesfield.com")
    expect(output).toContain(
      "wrangler deploy --env=judge --var SPEND_CAP_CREDITS:100"
    )
    expect(output).toContain("sign out, then delete the temporary folder")
  })

  it("refuses an owner link without a cap", async () => {
    const { error } = await deployWith(["--login", "--judge"])
    expect(error).toBeInstanceOf(Error)
  })

  it("names the workers, buckets and databases of wrangler.jsonc", () => {
    const config = readFileSync(join(gatewayRoot, "wrangler.jsonc"), "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n")
    const parsed = JSON.parse(config)
    const { judge } = parsed.env
    expect(parsed.name).toBe(deployTargets.public.worker)
    expect(parsed.d1_databases[0].database_name).toBe(
      deployTargets.public.database
    )
    expect(parsed.r2_buckets[0].bucket_name).toBe(deployTargets.public.bucket)
    expect(judge.name).toBe(deployTargets.judge.worker)
    expect(judge.d1_databases[0].database_name).toBe(
      deployTargets.judge.database
    )
    expect(judge.r2_buckets[0].bucket_name).toBe(deployTargets.judge.bucket)
  })
})
