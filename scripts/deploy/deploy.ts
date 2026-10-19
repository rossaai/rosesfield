import { spawnSync } from "node:child_process"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

type Plan = {
  isJudge: boolean
  isLocal: boolean
  isDryRun: boolean
  port: string
  envFiles: string[]
}

type Step = {
  command: string
  args: string[]
  cwd: string
  orElse?: Step
}

const root = fileURLToPath(new URL("../..", import.meta.url))
const gateway = fileURLToPath(
  new URL("../../services/gateway", import.meta.url)
)

const usage = [
  "bun run deploy [--judge] [--dry-run] [--local [--port <port>] [--env-file <file>]...]",
  "",
  "  --judge     a private owner link: owner mode on one Comfy key, with the spend cap of its environment",
  "  --local     builds and runs the deployment in wrangler's local runtime instead of Cloudflare",
  "  --dry-run   prints each step in order and runs none",
  "  --port      the local port, 8788 by default",
  "  --env-file  a file of settings for the local runtime, such as SESSION_SECRET, OWNER_TOKEN or COMFY_API_KEY",
].join("\n")

function planOf(args: readonly string[]): Plan {
  const plan: Plan = {
    isJudge: false,
    isLocal: false,
    isDryRun: false,
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
    } else if (arg === "--dry-run") {
      plan.isDryRun = true
    } else if (arg === "--port" && value !== undefined) {
      plan.port = value
      index += 1
    } else if (arg === "--env-file" && value !== undefined) {
      plan.envFiles.push(resolve(value))
      index += 1
    } else {
      throw new Error(`${arg} is not an option.\n\n${usage}`)
    }
  }
  return plan
}

function wrangler(args: readonly string[]): Step {
  return { command: "bunx", args: ["wrangler", ...args], cwd: gateway }
}

function stepsOf(plan: Plan): Step[] {
  const env = `--env=${plan.isJudge ? "judge" : ""}`
  const database = plan.isJudge ? "rosesfield-judge" : "rosesfield"
  const build: Step = { command: "bun", args: ["run", "build"], cwd: root }
  if (plan.isLocal) {
    return [
      build,
      wrangler(["d1", "migrations", "apply", database, "--local", env]),
      wrangler([
        "dev",
        env,
        "--port",
        plan.port,
        ...plan.envFiles.flatMap((file) => ["--env-file", file]),
      ]),
    ]
  }
  return [
    build,
    {
      ...wrangler(["d1", "info", database, env]),
      orElse: wrangler(["d1", "create", database, env]),
    },
    wrangler(["d1", "migrations", "apply", database, "--remote", env]),
    wrangler(["deploy", env]),
  ]
}

function textOf(step: Step): string {
  return [step.command, ...step.args].join(" ")
}

function run(step: Step): void {
  const done = spawnSync(step.command, step.args, {
    cwd: step.cwd,
    stdio: "inherit",
    env: { ...process.env, CI: "true" },
  })
  if (done.status === 0) {
    return
  }
  if (step.orElse !== undefined) {
    run(step.orElse)
    return
  }
  throw new Error(`${textOf(step)} stopped with ${done.status}`)
}

function deploy(plan: Plan): void {
  for (const step of stepsOf(plan)) {
    if (plan.isDryRun) {
      console.log(
        step.orElse === undefined
          ? textOf(step)
          : `${textOf(step)}, or else ${textOf(step.orElse)}`
      )
    } else {
      run(step)
    }
  }
}

try {
  deploy(planOf(process.argv.slice(2)))
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
