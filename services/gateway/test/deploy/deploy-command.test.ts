import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const command = fileURLToPath(
  new URL("../../../../scripts/deploy/deploy.ts", import.meta.url)
)

function plan(...args: string[]) {
  const done = spawnSync("bun", [command, "--dry-run", ...args], {
    encoding: "utf8",
  })
  return {
    status: done.status,
    steps: done.stdout.split("\n").filter((line) => line !== ""),
    error: done.stderr,
  }
}

describe("bun run deploy", () => {
  it("puts the public deployment on the domain it names, after the database it reads is migrated", () => {
    const { status, steps } = plan("--domain", "rosesfield.com")

    expect(status).toBe(0)
    expect(steps).toEqual([
      "bun run build",
      "bunx wrangler d1 info rosesfield --env=, or else bunx wrangler d1 create rosesfield --env=",
      "bunx wrangler d1 migrations apply rosesfield --remote --env=",
      "bunx wrangler deploy --env= --domain rosesfield.com",
    ])
  })

  it("deploys on its workers.dev address alone when no domain is named", () => {
    const { status, steps } = plan()

    expect(status).toBe(0)
    expect(steps.at(-1)).toBe("bunx wrangler deploy --env=")
  })

  it("keeps the judge deployment on its own database", () => {
    const { status, steps } = plan("--judge")

    expect(status).toBe(0)
    expect(steps).toContain(
      "bunx wrangler d1 migrations apply rosesfield-judge --remote --env=judge"
    )
    expect(steps.at(-1)).toBe("bunx wrangler deploy --env=judge")
  })

  it("refuses a domain that is not a host name, and a domain for the local runtime", () => {
    const badHost = plan("--domain", "https://rosesfield.com/")
    const local = plan("--local", "--domain", "rosesfield.com")

    expect(badHost.status).toBe(1)
    expect(badHost.steps).toEqual([])
    expect(badHost.error).toContain("is not a domain")
    expect(local.status).toBe(1)
    expect(local.steps).toEqual([])
    expect(local.error).toContain("--local runs none")
  })
})
