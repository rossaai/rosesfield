import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { deployTargets, gatewayRoot } from "../deploy-targets"
import { capGivenTo, deployWith, production, sha256 } from "./fake-deploy"
import { countIn } from "./login-harness"

const ownerLinkLine = "The owner link, printed once. Keep it now:"

describe("bun run deploy --login", () => {
  it("runs every wrangler call in its own folder and creates what is missing", async () => {
    const { harness, calls, error } = await deployWith(production)
    expect(error).toBeNull()
    const [folder = ""] = harness.folders
    expect(calls.map((call) => call.args.slice(0, 3).join(" "))).toEqual([
      "whoami --json --env-file",
      "r2 bucket info",
      "r2 bucket create",
      "d1 info rosesfield",
      "d1 create rosesfield",
      "d1 migrations apply",
      "deploy --env= --domain",
      "secret list --env=",
      "secret put SESSION_SECRET",
      "r2 bucket info",
      "r2 bucket create",
      "d1 info rosesfield-judge",
      "d1 create rosesfield-judge",
      "d1 migrations apply",
      "deploy --env=judge --var",
      "secret list --env=judge",
      "secret put OWNER_TOKEN",
      "secret list --env=judge",
      "secret put COMFY_API_KEY",
    ])
    for (const call of calls) {
      expect(call.home).toBe(join(folder, "home"))
      expect(call.config).toBe(join(folder, "config"))
    }
    expect(harness.logins).toBe(1)
    expect(harness.logouts).toBe(1)
    expect(existsSync(folder)).toBe(false)
  })

  it("gives the --cap value to the owner link's SPEND_CAP_CREDITS and checks the Worker reports it", async () => {
    const { harness, calls, error } = await deployWith([
      ...production.slice(0, -1),
      "250",
    ])
    expect(error).toBeNull()
    expect(capGivenTo(calls)).toBe(250)
    const publicDeploy = calls.find(
      (call) => call.args[0] === "deploy" && call.args.includes("--env=")
    )
    expect(publicDeploy?.args.join(" ")).not.toContain("SPEND_CAP_CREDITS")
    expect(harness.output.join("")).toContain(
      "/api/account with the owner token answers 200 with a cap of 250 credits: yes"
    )
  })

  it("skips the bucket, the database and the secrets that exist, and checks the owner link you paste", async () => {
    const kept =
      "kept0000000000000000000000000000000000000000000000000000000000"
    const run = await deployWith(production, {
      existing: "r2,d1,secrets",
      answer: (question) =>
        question.includes("Type yes")
          ? "yes"
          : `https://rosesfield-judge.fake-account.workers.dev/#token=${kept}`,
      ownerToken: kept,
    })
    expect(run.error).toBeNull()
    const made = run.calls.filter((call) =>
      /^(r2 bucket create|d1 create|secret put)/.test(call.args.join(" "))
    )
    expect(made).toEqual([])
    expect(run.harness.secrets).toEqual([])
    const output = run.harness.output.join("")
    expect(output).toContain("/api/runs with the owner token answers 200: yes")
    expect(output).toContain(
      "/api/account with the owner token answers 200 with a cap of 100 credits: yes"
    )
    expect(countIn(output, kept)).toBe(0)
  })

  it("stops when the pasted owner link does not open", async () => {
    const { error } = await deployWith(production, {
      existing: "r2,d1,secrets",
      answer: (question) =>
        question.includes("Type yes") ? "yes" : "#token=not-the-kept-token",
      ownerToken: "the-kept-token",
    })
    expect(String(error)).toContain("/api/runs answered 401")
  })

  it("makes a new owner token and prints its link when you press Enter", async () => {
    const { harness, calls, error } = await deployWith(production, {
      existing: "r2,d1,secrets",
    })
    expect(error).toBeNull()
    const [ownerToken = ""] = harness.secrets
    const put = calls.find((call) => call.args[2] === "OWNER_TOKEN")
    expect(put?.stdinHash).toBe(sha256(ownerToken))
    expect(countIn(harness.output.join(""), ownerToken)).toBe(1)
  })

  it("prints the owner link when wrangler secret put OWNER_TOKEN fails, since it may have stored the token", async () => {
    const { harness, error } = await deployWith(production, {
      failOn: "secret put OWNER_TOKEN",
    })
    expect(String(error)).toContain("secret put OWNER_TOKEN failed")
    const output = harness.output.join("")
    const [, ownerToken = ""] = harness.secrets
    expect(output).toContain("may have stored the token anyway")
    expect(countIn(output, ownerToken)).toBe(1)
    expect(existsSync(harness.folders[0] ?? "")).toBe(false)
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
      `${ownerLinkLine}\nhttps://rosesfield-judge.fake-account.workers.dev/#token=${ownerToken}`
    )
    const argv = calls.flatMap((call) => call.args).join(" ")
    expect(argv).not.toContain(sessionSecret)
    expect(argv).not.toContain(ownerToken)
    expect(harness.leaks).toEqual([])
    expect(JSON.stringify(calls)).not.toContain(sessionSecret)
  })

  it("prints the owner link once, before the Comfy key prompt, so a later failure loses no token", async () => {
    const { harness, error } = await deployWith(production, {
      failOn: "secret put COMFY_API_KEY",
    })
    expect(error).toBeInstanceOf(Error)
    const output = harness.output.join("")
    const [, ownerToken = ""] = harness.secrets
    expect(countIn(output, ownerToken)).toBe(1)
    expect(output.indexOf(ownerToken)).toBeLessThan(
      output.indexOf("asks you for the Comfy key")
    )
    expect(harness.logouts).toBe(1)
    expect(existsSync(harness.folders[0] ?? "")).toBe(false)
  })

  it("signs out and deletes the folder when a step fails", async () => {
    const { harness, error } = await deployWith(production, {
      failOn: "deploy --env=judge",
    })
    expect(error).toBeInstanceOf(Error)
    expect(harness.logouts).toBe(1)
    expect(harness.folders).toHaveLength(1)
    expect(existsSync(harness.folders[0] ?? "")).toBe(false)
    expect(harness.output.join("")).not.toContain(ownerLinkLine)
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
    expect(output).toContain("you type yes")
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
