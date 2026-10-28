import { existsSync } from "node:fs"
import { createServer } from "node:net"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { gatewayRoot, repositoryRoot } from "../deploy-targets"
import { ProcessShell } from "../process-shell"
import { countIn, newHarness, runHarness } from "./login-harness"

const wrangler = join(gatewayRoot, "node_modules", ".bin", "wrangler")

async function freePort(): Promise<number> {
  return await new Promise((done, fail) => {
    const server = createServer()
    server.once("error", fail)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      const port =
        typeof address === "object" && address !== null ? address.port : 0
      server.close(() => done(port))
    })
  })
}

async function buildOnce(): Promise<void> {
  if (
    existsSync(join(repositoryRoot, "apps", "platform", "dist", "index.html"))
  ) {
    return
  }
  const built = await new ProcessShell({ write: () => undefined }).run({
    command: "bun",
    args: ["run", "build"],
    cwd: repositoryRoot,
    env: { ...process.env },
  })
  expect(built.status).toBe(0)
}

describe("bun run deploy --login --local", () => {
  it("runs the whole flow on wrangler's local runtime with doubles for the sign-in", async () => {
    const harness = newHarness()
    const port = await freePort()
    await runHarness(
      harness,
      ["--login", "--local", "--judge", "--cap", "5", "--port", `${port}`],
      {
        wrangler: [wrangler],
        fetch: (url, init) => fetch(url, init),
        build: buildOnce,
        sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
      }
    )
    const output = harness.output.join("")
    const [sessionSecret = "", ownerToken = ""] = harness.secrets
    expect(harness.logins).toBe(1)
    expect(harness.logouts).toBe(1)
    expect(output).toContain(`127.0.0.1:${port}/privacy answers 200: yes`)
    expect(output).toContain(
      `127.0.0.1:${port}/api/runs with the owner token answers 200: yes`
    )
    expect(output).toContain(`127.0.0.1:${port}/api/runs answers 401: yes`)
    expect(countIn(output, sessionSecret)).toBe(0)
    expect(countIn(output, ownerToken)).toBe(1)
    expect(harness.leaks).toEqual([])
    expect(existsSync(harness.folders[0] ?? "")).toBe(false)
  }, 240_000)
})
