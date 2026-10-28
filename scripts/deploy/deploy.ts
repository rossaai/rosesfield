import { spawnSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createInterface } from "node:readline/promises"
import { type DeployOptions, deployOptionsOf } from "./deploy-options"
import { gatewayRoot, repositoryRoot } from "./deploy-targets"
import { type Account, loginDeploy, wranglerAccount } from "./login-deploy"
import { ProcessShell } from "./process-shell"

type Step = {
  command: string
  args: string[]
  cwd: string
  orElse?: Step
}

function wrangler(args: readonly string[]): Step {
  return { command: "bunx", args: ["wrangler", ...args], cwd: gatewayRoot }
}

function stepsOf(options: DeployOptions): Step[] {
  const env = `--env=${options.isJudge ? "judge" : ""}`
  const database = options.isJudge ? "rosesfield-judge" : "rosesfield"
  const cap =
    options.cap === null ? [] : ["--var", `SPEND_CAP_CREDITS:${options.cap}`]
  const build: Step = {
    command: "bun",
    args: ["run", "build"],
    cwd: repositoryRoot,
  }
  if (options.isLocal) {
    return [
      build,
      wrangler(["d1", "migrations", "apply", database, "--local", env]),
      wrangler([
        "dev",
        env,
        "--port",
        options.port,
        ...cap,
        ...options.envFiles.flatMap((file) => ["--env-file", file]),
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
    wrangler([
      "deploy",
      env,
      ...(options.domain === null ? [] : ["--domain", options.domain]),
      ...cap,
    ]),
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

function deploy(options: DeployOptions): void {
  for (const step of stepsOf(options)) {
    if (options.isDryRun) {
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

const noAccount: Account = {
  async login() {
    console.log("The local runtime needs no sign-in.")
  },
  async logout() {
    console.log("The local runtime holds no sign-in.")
  },
}

const stopSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"]

function stopOnSignals(): AbortSignal {
  const stop = new AbortController()
  for (const name of stopSignals) {
    process.on(name, () => stop.abort())
  }
  process.stdout.on("error", () => undefined)
  process.stderr.on("error", () => undefined)
  return stop.signal
}

async function askOperator(
  question: string,
  signal: AbortSignal
): Promise<string> {
  const reader = createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  try {
    return await reader.question(question, { signal })
  } finally {
    reader.close()
  }
}

async function deployWithLogin(options: DeployOptions): Promise<void> {
  const signal = stopOnSignals()
  const shell = new ProcessShell({
    write: (text) => process.stdout.write(text),
    signal,
  })
  await loginDeploy(options, {
    shell,
    account: options.isLocal ? noAccount : wranglerAccount,
    wrangler: [join(gatewayRoot, "node_modules", ".bin", "wrangler")],
    makeFolder: () => mkdtempSync(join(tmpdir(), "rosesfield-deploy-")),
    removeFolder: (folder) => rmSync(folder, { recursive: true, force: true }),
    makeSecret: () => randomBytes(32).toString("hex"),
    fetch: (url, init) => fetch(url, init),
    sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
    print: (line) => console.log(line),
    ask: (question) => askOperator(question, signal),
    build: async () => {
      const built = await shell.run({
        command: "bun",
        args: ["run", "build"],
        cwd: repositoryRoot,
        env: { ...process.env },
      })
      if (built.status !== 0) {
        throw new Error(`bun run build stopped with ${built.status}`)
      }
    },
    localComfyKey: "stand-in-key-for-the-local-runtime",
    signal,
  })
}

try {
  const options = deployOptionsOf(process.argv.slice(2))
  if (options.isLogin) {
    await deployWithLogin(options)
  } else {
    deploy(options)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
