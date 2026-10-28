import { spawn } from "node:child_process"
import { existsSync, readdirSync, rmSync } from "node:fs"
import { createServer } from "node:net"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { gatewayRoot, repositoryRoot } from "../deploy-targets"
import { ProcessShell } from "../process-shell"
import { countIn, newHarness, runHarness, testFolder } from "./login-harness"

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

  for (const signal of ["SIGHUP", "SIGTERM"] as const) {
    it(`signs out and deletes the folder when ${signal} comes mid-run`, async () => {
      const temporary = testFolder()
      const port = await freePort()
      const run = spawn(
        "bun",
        [
          join(repositoryRoot, "scripts", "deploy", "deploy.ts"),
          "--login",
          "--local",
          "--port",
          `${port}`,
        ],
        { env: { ...process.env, TMPDIR: temporary }, stdio: "pipe" }
      )
      let output = ""
      const exited = new Promise<number | null>((done) => {
        run.once("close", done)
      })
      await new Promise<void>((done) => {
        run.stdout.on("data", (chunk: Buffer) => {
          output += chunk.toString("utf8")
          if (output.includes("wrangler d1 migrations apply")) {
            done()
          }
        })
      })
      const held = readdirSync(temporary).filter((name) =>
        name.startsWith("rosesfield-deploy-")
      )
      run.kill(signal)
      const status = await exited
      const left = readdirSync(temporary).filter((name) =>
        name.startsWith("rosesfield-deploy-")
      )
      rmSync(temporary, { recursive: true, force: true })
      expect(held).toHaveLength(1)
      expect(status).toBe(1)
      expect(output).toContain("sign out, then delete the temporary folder")
      expect(output).toContain("The local runtime holds no sign-in.")
      expect(left).toEqual([])
    }, 240_000)
  }
})
