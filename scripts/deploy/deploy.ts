import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

type Plan = {
  isJudge: boolean
  isLocal: boolean
  port: string
  envFiles: string[]
}

const root = fileURLToPath(new URL("../..", import.meta.url))
const gateway = fileURLToPath(
  new URL("../../services/gateway", import.meta.url)
)

const usage = [
  "bun run deploy [--judge] [--local [--port <port>] [--env-file <file>]...]",
  "",
  "  --judge     a private owner link: owner mode on one Comfy key, with the spend cap of its environment",
  "  --local     builds and runs the deployment in wrangler's local runtime instead of Cloudflare",
  "  --port      the local port, 8788 by default",
  "  --env-file  a file of settings for the local runtime, such as SESSION_SECRET, OWNER_TOKEN or COMFY_API_KEY",
].join("\n")

function planOf(args: readonly string[]): Plan {
  const plan: Plan = {
    isJudge: false,
    isLocal: false,
    port: "8788",
    envFiles: [],
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const value = args[index + 1]
    if (arg === "--judge") {
      plan.isJudge = true
    } else if (arg === "--local") {
      plan.isLocal = true
    } else if (arg === "--port" && value !== undefined) {
      plan.port = value
      index += 1
    } else if (arg === "--env-file" && value !== undefined) {
      plan.envFiles.push(value)
      index += 1
    } else {
      throw new Error(`${arg} is not an option.\n\n${usage}`)
    }
  }
  return plan
}

function run(command: string, args: readonly string[], cwd: string): void {
  const done = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, CI: "true" },
  })
  if (done.status !== 0) {
    throw new Error(`${command} ${args[0] ?? ""} stopped with ${done.status}`)
  }
}

function wrangler(args: readonly string[]): void {
  run("bunx", ["wrangler", ...args], gateway)
}

function deploy(plan: Plan): void {
  const env = plan.isJudge ? "judge" : ""
  const database = plan.isJudge ? "rosesfield-judge" : "rosesfield"
  run("bun", ["run", "build"], root)
  if (plan.isLocal) {
    wrangler(["d1", "migrations", "apply", database, "--local", `--env=${env}`])
    wrangler([
      "dev",
      `--env=${env}`,
      "--port",
      plan.port,
      ...plan.envFiles.flatMap((file) => ["--env-file", file]),
    ])
    return
  }
  wrangler(["deploy", `--env=${env}`])
  wrangler(["d1", "migrations", "apply", database, "--remote", `--env=${env}`])
}

try {
  deploy(planOf(process.argv.slice(2)))
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
