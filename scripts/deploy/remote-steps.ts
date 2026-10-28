import type { DeployOptions } from "./deploy-options"
import type { DeployTarget } from "./deploy-targets"
import {
  addressOf,
  capArgs,
  comfyKey,
  type LoginStep,
  printOwnerLink,
  probesOf,
  tokenHolder,
} from "./login-step"
import { probeText, smokeCheck } from "./smoke-check"
import type { WranglerSession } from "./wrangler-session"

export function remoteSteps(
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
    deployStep(options, target),
    secretStep(target),
    ...(target.kind === "judge" ? [comfyKeyStep(target)] : []),
    {
      text: `check the live address: ${probesOf(options, target, tokenHolder).map(probeText).join(", ")}`,
      run: async (session, tools) => {
        await smokeCheck({
          ...tools,
          address: addressOf(session, target),
          probes: probesOf(options, target, session.secrets.get(target.secret)),
          attempts: 36,
          intervalMs: 5000,
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
        tools.print(`${check.slice(0, 3).join(" ")}: it exists, skipped`)
        return
      }
      await session.run(make)
    },
  }
}

function secretStep(target: DeployTarget): LoginStep {
  const env = `--env=${target.env}`
  const shown =
    target.kind === "judge"
      ? ", and the owner link is printed once, right away"
      : ""
  return {
    text: `wrangler secret list ${env}, and when ${target.secret} is missing, 32 random bytes go to wrangler secret put ${target.secret} ${env} on its stdin${shown}`,
    run: async (session, tools) => {
      if ((await secretsOf(session, target)).includes(target.secret)) {
        tools.print(`${target.secret}: it is set, kept`)
        if (target.kind === "judge") {
          session.ownerLink = "kept"
        }
        return
      }
      const secret = tools.makeSecret()
      await session.run(["secret", "put", target.secret, env], {
        stdin: secret,
      })
      session.secrets.set(target.secret, secret)
      if (target.kind === "judge") {
        printOwnerLink(session, tools, secret)
      }
    },
  }
}

function comfyKeyStep(target: DeployTarget): LoginStep {
  const env = `--env=${target.env}`
  return {
    text: `when ${comfyKey} is missing, wrangler secret put ${comfyKey} ${env} asks you for the Comfy key`,
    run: async (session, tools) => {
      if ((await secretsOf(session, target)).includes(comfyKey)) {
        tools.print(`${comfyKey}: it is set, kept`)
        return
      }
      await session.run(["secret", "put", comfyKey, env], { isPrompt: true })
    },
  }
}

async function secretsOf(
  session: WranglerSession,
  target: DeployTarget
): Promise<string[]> {
  const listed = await session.read([
    "secret",
    "list",
    `--env=${target.env}`,
    "--format",
    "json",
  ])
  const names = listed.status === 0 ? secretNamesOf(listed.output) : null
  if (names === null) {
    throw new Error(
      `wrangler secret list --env=${target.env} gave no list, so the run stops rather than replace a secret that may exist.`
    )
  }
  return names
}

function secretNamesOf(output: string): string[] | null {
  const start = output.indexOf("[")
  if (start < 0) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(output.slice(start))
    if (!Array.isArray(parsed)) {
      return null
    }
    return parsed.flatMap((entry: unknown) =>
      typeof entry === "object" &&
      entry !== null &&
      "name" in entry &&
      typeof entry.name === "string"
        ? [entry.name]
        : []
    )
  } catch {
    return null
  }
}

function deployStep(options: DeployOptions, target: DeployTarget): LoginStep {
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
