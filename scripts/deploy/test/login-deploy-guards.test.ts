import { existsSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { revokePage } from "../login-deploy"
import { smokeCheck } from "../smoke-check"
import { deployWith, production } from "./fake-deploy"

const planted = {
  CLOUDFLARE_API_TOKEN: "planted-api-token",
  CLOUDFLARE_ACCOUNT_ID: "planted0000000000000000000000000",
  CLOUDFLARE_API_KEY: "planted-api-key",
  CLOUDFLARE_EMAIL: "planted@example.com",
  CF_API_TOKEN: "planted-legacy-token",
  WRANGLER_LOG_PATH: "/planted/log/path",
}

const accountId = "0123456789abcdef0123456789abcdef"

afterEach(() => {
  for (const name of Object.keys(planted)) {
    delete process.env[name]
  }
})

describe("the session of bun run deploy --login", () => {
  it("passes no account variable of this machine to wrangler", async () => {
    Object.assign(process.env, planted)
    const { harness, calls, error } = await deployWith(production)
    expect(error).toBeNull()
    expect(calls.length).toBeGreaterThan(10)
    const noEnvFile = join(harness.folders[0] ?? "", "none.env")
    for (const call of calls) {
      expect(call.accountVariables).toEqual({ WRANGLER_SEND_METRICS: "false" })
      expect(call.args.slice(-2)).toEqual(["--env-file", noEnvFile])
    }
  })

  it("passes only the --account id as CLOUDFLARE_ACCOUNT_ID", async () => {
    Object.assign(process.env, planted)
    const { calls, harness, error } = await deployWith([
      ...production,
      "--account",
      accountId,
    ])
    expect(error).toBeNull()
    expect(harness.questions).toEqual([])
    for (const call of calls) {
      expect(call.accountVariables).toEqual({
        WRANGLER_SEND_METRICS: "false",
        CLOUDFLARE_ACCOUNT_ID: accountId,
      })
    }
  })
})

describe("the account check of bun run deploy --login", () => {
  it("asks once with the account name and id, and creates nothing without yes", async () => {
    const { harness, calls, error } = await deployWith(production, {
      answer: () => "y",
    })
    expect(error).toBeInstanceOf(Error)
    expect(harness.output.join("")).toContain(
      `Signed in to Production (${accountId}).`
    )
    expect(harness.questions).toHaveLength(1)
    expect(calls.map((call) => call.args[0])).toEqual(["whoami"])
    expect(harness.logouts).toBe(1)
  })

  it("stops when --account names an account the sign-in does not reach", async () => {
    const { calls, error } = await deployWith([
      ...production,
      "--account",
      "fedcba9876543210fedcba9876543210",
    ])
    expect(String(error)).toContain("does not reach --account")
    expect(calls.map((call) => call.args[0])).toEqual(["whoami"])
  })

  it("stops when the sign-in reaches two accounts and --account names none", async () => {
    const { harness, calls, error } = await deployWith(production, {
      existing: "two-accounts",
    })
    expect(String(error)).toContain("Run again with --account <id>")
    expect(harness.questions).toEqual([])
    expect(calls.map((call) => call.args[0])).toEqual(["whoami"])
  })
})

describe("the stops of bun run deploy --login", () => {
  it("stops instead of replacing a secret when wrangler secret list fails", async () => {
    const { harness, calls, error } = await deployWith(production, {
      existing: "secret-list-fails",
    })
    expect(String(error)).toContain("gave no list")
    expect(calls.some((call) => call.args[1] === "put")).toBe(false)
    expect(existsSync(harness.folders[0] ?? "")).toBe(false)
  })

  it("says plainly when the sign-out fails and where to revoke the sign-in", async () => {
    const { harness, error } = await deployWith(production, {
      logoutFails: true,
    })
    expect(error).toBeNull()
    const output = harness.output.join("")
    expect(output).toContain("SIGN-OUT FAILED")
    expect(output).toContain(revokePage)
    expect(existsSync(harness.folders[0] ?? "")).toBe(false)
  })

  it("stops the live checks of a site that never answers when the signal comes", async () => {
    const stop = new AbortController()
    const started = Date.now()
    const checked = smokeCheck({
      address: "https://down.example",
      probes: [{ path: "/", status: 200 }],
      attempts: 36,
      intervalMs: 5000,
      fetch: () => Promise.reject(new Error("no route")),
      sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
      print: () => undefined,
      signal: stop.signal,
    })
    setTimeout(() => stop.abort(), 50)
    await expect(checked).rejects.toThrow("Stopped")
    expect(Date.now() - started).toBeLessThan(2000)
  })

  it("signs out and deletes the folder when the signal comes during the live checks", async () => {
    const stop = new AbortController()
    const { harness, error } = await deployWith(production, {
      signal: stop.signal,
      sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
      fetch: async () => {
        stop.abort()
        return new Response(null, { status: 503 })
      },
    })
    expect(String(error)).toContain("Stopped")
    expect(harness.logouts).toBe(1)
    expect(existsSync(harness.folders[0] ?? "")).toBe(false)
  })
})
