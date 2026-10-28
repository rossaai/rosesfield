import type { DeployOptions } from "./deploy-options"
import type { DeployTarget } from "./deploy-targets"
import {
  capArgs,
  comfyKey,
  type LoginStep,
  printOwnerLink,
  probesOf,
  type StepTools,
  tokenHolder,
} from "./login-step"
import { probeText, smokeCheck } from "./smoke-check"
import type { WranglerSession } from "./wrangler-session"

const refusedEngine = "http://127.0.0.1:9"

export function localSteps(
  options: DeployOptions,
  target: DeployTarget
): LoginStep[] {
  const env = `--env=${target.env}`
  const address = `http://127.0.0.1:${options.port}`
  const state = `<folder>/state/${target.kind}`
  const devArgs = [
    "dev",
    "--local",
    env,
    "--ip",
    "127.0.0.1",
    "--port",
    options.port,
    "--persist-to",
    state,
    "--show-interactive-dev-session=false",
    ...capArgs(options, target),
  ]
  const standIn =
    target.kind === "judge"
      ? `, a stand-in key becomes ${comfyKey} with an engine address that refuses every call, and the owner link is printed once`
      : ""
  return [
    {
      text: `wrangler d1 migrations apply ${target.database} --local --persist-to ${state} ${env}`,
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
      text: `32 random bytes become ${target.secret} in the local runtime's environment${standIn}`,
      run: async (session, tools) => {
        const secret = tools.makeSecret()
        session.secrets.set(target.secret, secret)
        session.addresses.set(target.kind, address)
        if (target.kind === "judge") {
          printOwnerLink(session, tools, secret)
        }
      },
    },
    {
      text: `wrangler ${devArgs.join(" ")}, then check ${address}: ${probesOf(options, target, tokenHolder).map(probeText).join(", ")}, then stop it`,
      run: (session, tools) =>
        runLocal({ session, tools, options, target, address, devArgs, state }),
    },
  ]
}

async function runLocal(run: {
  session: WranglerSession
  tools: StepTools
  options: DeployOptions
  target: DeployTarget
  address: string
  devArgs: readonly string[]
  state: string
}): Promise<void> {
  const { session, tools, target } = run
  const secret = session.secrets.get(target.secret) ?? tools.makeSecret()
  const env: Record<string, string> = {
    CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
    [target.secret]: secret,
    ...(target.kind === "judge"
      ? { [comfyKey]: tools.localComfyKey, COMFY_BASE_URL: refusedEngine }
      : {}),
  }
  const args = run.devArgs.map((arg) =>
    arg === run.state ? session.statePathOf(target.kind) : arg
  )
  const started = session.start(args, env)
  try {
    await smokeCheck({
      ...tools,
      address: run.address,
      probes: probesOf(run.options, target, secret),
      attempts: 90,
      intervalMs: 1000,
    })
  } finally {
    await started.stop()
  }
}
