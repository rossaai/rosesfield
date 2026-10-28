import type { DeployOptions } from "./deploy-options"
import { type DeployTarget, deployTargets } from "./deploy-targets"
import { type Probe, probeText, smokeCheck } from "./smoke-check"
import type { WranglerSession } from "./wrangler-session"

export type StepTools = {
  makeSecret: () => string
  fetch: (url: string, init: RequestInit) => Promise<Response>
  sleep: (ms: number) => Promise<void>
  print: (line: string) => void
  build: () => Promise<void>
  login: (session: WranglerSession) => Promise<void>
  localComfyKey: string
}

export type LoginStep = {
  text: string
  run: (session: WranglerSession, tools: StepTools) => Promise<void>
}

const comfyKey = "COMFY_API_KEY"

export function loginStepsOf(options: DeployOptions): LoginStep[] {
  const targets: DeployTarget[] = options.isJudge
    ? [deployTargets.public, deployTargets.judge]
    : [deployTargets.public]
  const local = options.isLocal
  return [
    { text: "bun run build", run: (_, tools) => tools.build() },
    ...accountSteps(local),
    ...targets.flatMap((target) =>
      local ? localSteps(options, target) : remoteSteps(options, target)
    ),
  ]
}

function accountSteps(local: boolean): LoginStep[] {
  const login: LoginStep = {
    text: local
      ? "sign in: the local runtime needs no account"
      : "wrangler login, with its config in a new temporary folder: sign in to the account you deploy to, in the browser",
    run: (session, tools) => tools.login(session),
  }
  if (local) {
    return [login]
  }
  return [
    login,
    {
      text: "wrangler whoami: the account this run deploys to",
      run: async (session) => {
        await session.run(["whoami"])
      },
    },
  ]
}

function remoteSteps(
  options: DeployOptions,
  target: DeployTarget
): LoginStep[] {
  const env = `--env=${target.env}`
  return [
    orElse(
      ["r2", "bucket", "info", target.bucket],
      ["r2", "bucket", "create", target.bucket, "--update-config=false"]
    ),
    orElse(
      ["d1", "info", target.database, env],
      ["d1", "create", target.database, "--update-config=false"]
    ),
    always(["d1", "migrations", "apply", target.database, "--remote", env]),
    remoteSecretStep(target),
    ...(target.kind === "judge" ? [comfyKeyStep(target)] : []),
    remoteDeployStep(options, target),
    {
      text: `check the live address: ${probesOf(target, "<token>").map(probeText).join(", ")}`,
      run: async (session, tools) => {
        await smokeCheck({
          address: addressOf(session, target),
          probes: probesOf(target, session.secrets.get(target.secret)),
          attempts: 36,
          intervalMs: 5000,
          ...tools,
        })
      },
    },
  ]
}

function always(args: string[]): LoginStep {
  return {
    text: `wrangler ${args.join(" ")}`,
    run: async (session) => {
      await session.run(args)
    },
  }
}

function orElse(check: string[], make: string[]): LoginStep {
  return {
    text: `wrangler ${check.join(" ")}, or else wrangler ${make.join(" ")}`,
    run: async (session, tools) => {
      if (await session.run(check, { mayFail: true })) {
        tools.print(
          `${check[check.length - 2] ?? ""} ${check[check.length - 1] ?? ""}: it exists, skipped`
        )
        return
      }
      await session.run(make)
    },
  }
}

function remoteSecretStep(target: DeployTarget): LoginStep {
  const env = `--env=${target.env}`
  return {
    text: `wrangler secret list ${env}, and when ${target.secret} is missing, 32 random bytes go to wrangler secret put ${target.secret} ${env} on its stdin`,
    run: async (session, tools) => {
      if (await hasSecret(session, target, target.secret)) {
        tools.print(`${target.secret}: it is set, skipped`)
        return
      }
      const secret = tools.makeSecret()
      await session.run(["secret", "put", target.secret, env], {
        stdin: secret,
      })
      session.secrets.set(target.secret, secret)
    },
  }
}

function comfyKeyStep(target: DeployTarget): LoginStep {
  const env = `--env=${target.env}`
  return {
    text: `when ${comfyKey} is missing, wrangler secret put ${comfyKey} ${env} asks you for the Comfy key`,
    run: async (session, tools) => {
      if (await hasSecret(session, target, comfyKey)) {
        tools.print(`${comfyKey}: it is set, skipped`)
        return
      }
      await session.run(["secret", "put", comfyKey, env], { isPrompt: true })
    },
  }
}

async function hasSecret(
  session: WranglerSession,
  target: DeployTarget,
  name: string
): Promise<boolean> {
  const listed = await session.read([
    "secret",
    "list",
    `--env=${target.env}`,
    "--format",
    "json",
  ])
  return listed.status === 0 && secretNamesOf(listed.output).includes(name)
}

function secretNamesOf(output: string): string[] {
  const start = output.indexOf("[")
  if (start < 0) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(output.slice(start))
    return Array.isArray(parsed)
      ? parsed.flatMap((entry: unknown) =>
          typeof entry === "object" &&
          entry !== null &&
          "name" in entry &&
          typeof entry.name === "string"
            ? [entry.name]
            : []
        )
      : []
  } catch {
    return []
  }
}

function remoteDeployStep(
  options: DeployOptions,
  target: DeployTarget
): LoginStep {
  const args = [
    "deploy",
    `--env=${target.env}`,
    ...(target.kind === "public" && options.domain !== null
      ? ["--domain", options.domain]
      : []),
    ...capArgs(options, target),
  ]
  return {
    text: `wrangler ${args.join(" ")}`,
    run: async (session) => {
      const deployed = await session.read(args)
      if (deployed.status !== 0) {
        throw new Error(
          `wrangler ${args.join(" ")} stopped with ${deployed.status}`
        )
      }
      const workersDev = new RegExp(
        `https://${target.worker}\\.[a-z0-9-]+\\.workers\\.dev`
      ).exec(deployed.output)?.[0]
      const address =
        target.kind === "public" && options.domain !== null
          ? `https://${options.domain}`
          : workersDev
      if (address === undefined) {
        throw new Error(
          `wrangler deploy printed no workers.dev address for ${target.worker}.`
        )
      }
      session.addresses.set(target.kind, address)
    },
  }
}

function localSteps(options: DeployOptions, target: DeployTarget): LoginStep[] {
  const env = `--env=${target.env}`
  const stateHolder = `<folder>/state/${target.kind}`
  const devArgs = [
    "dev",
    "--local",
    env,
    "--ip",
    "127.0.0.1",
    "--port",
    options.port,
    "--persist-to",
    stateHolder,
    "--show-interactive-dev-session=false",
    ...capArgs(options, target),
  ]
  return [
    {
      text: `wrangler d1 migrations apply ${target.database} --local --persist-to <folder>/state/${target.kind} ${env}`,
      run: async (session) => {
        await session.run([
          "d1",
          "migrations",
          "apply",
          target.database,
          "--local",
          "--persist-to",
          session.statePathOf(target.kind),
          env,
        ])
      },
    },
    {
      text: `32 random bytes become ${target.secret} in the local runtime's environment${target.kind === "judge" ? `, and a stand-in key becomes ${comfyKey}` : ""}`,
      run: async (session, tools) => {
        session.secrets.set(target.secret, tools.makeSecret())
      },
    },
    {
      text: `wrangler ${devArgs.join(" ")}, then check http://127.0.0.1:${options.port}: ${probesOf(target, "<token>").map(probeText).join(", ")}, then stop it`,
      run: (session, tools) =>
        runLocal(session, tools, target, devArgs, options.port),
    },
  ]
}

async function runLocal(
  session: WranglerSession,
  tools: StepTools,
  target: DeployTarget,
  devArgs: string[],
  port: string
): Promise<void> {
  const secret = session.secrets.get(target.secret) ?? tools.makeSecret()
  const env: Record<string, string> = {
    CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
    [target.secret]: secret,
    ...(target.kind === "judge" ? { [comfyKey]: tools.localComfyKey } : {}),
  }
  const address = `http://127.0.0.1:${port}`
  const stateHolder = `<folder>/state/${target.kind}`
  const args = devArgs.map((arg) =>
    arg === stateHolder ? session.statePathOf(target.kind) : arg
  )
  const started = session.start(args, env)
  try {
    await smokeCheck({
      address,
      probes: probesOf(target, secret),
      attempts: 90,
      intervalMs: 1000,
      ...tools,
    })
    session.addresses.set(target.kind, address)
  } finally {
    await started.stop()
  }
}

function capArgs(options: DeployOptions, target: DeployTarget): string[] {
  return target.kind === "judge" && options.cap !== null
    ? ["--var", `SPEND_CAP_CREDITS:${options.cap}`]
    : []
}

function addressOf(session: WranglerSession, target: DeployTarget): string {
  const address = session.addresses.get(target.kind)
  if (address === undefined) {
    throw new Error(`${target.worker} has no address to check.`)
  }
  return address
}

function probesOf(target: DeployTarget, token: string | undefined): Probe[] {
  if (target.kind === "public") {
    return [
      { path: "/", status: 200 },
      { path: "/api/runs", status: 200 },
      { path: "/privacy", status: 200 },
    ]
  }
  return [
    { path: "/", status: 200 },
    { path: "/api/runs", status: 401 },
    ...(token === undefined ? [] : [{ path: "/api/runs", status: 200, token }]),
  ]
}
