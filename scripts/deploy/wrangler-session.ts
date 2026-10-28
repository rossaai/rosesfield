import { writeFileSync } from "node:fs"
import { basename, delimiter, join } from "node:path"
import type { DeployOptions } from "./deploy-options"
import { gatewayRoot } from "./deploy-targets"
import type {
  ProcessShell,
  ShellCommand,
  ShellResult,
  Started,
} from "./process-shell"

export type WranglerSessionOptions = {
  folder: string
  wrangler: readonly string[]
  shell: ProcessShell
  options: DeployOptions
}

export type WranglerRun = {
  stdin?: string
  isPrompt?: boolean
  mayFail?: boolean
}

const passedVariables = [
  "PATH",
  "TERM",
  "LANG",
  "LC_ALL",
  "TMPDIR",
  "HTTPS_PROXY",
  "HTTP_PROXY",
  "NO_PROXY",
  "NODE_EXTRA_CA_CERTS",
]

export function nodePath(path: string): string {
  return path
    .split(delimiter)
    .filter((folder) => !basename(folder).startsWith("bun-node-"))
    .join(delimiter)
}

export class WranglerSession {
  readonly folder: string
  readonly secrets = new Map<string, string>()
  readonly addresses = new Map<string, string>()
  readonly #wrangler: readonly string[]
  readonly #shell: ProcessShell
  readonly #options: DeployOptions
  readonly #noEnvFile: string

  constructor(options: WranglerSessionOptions) {
    this.folder = options.folder
    this.#wrangler = options.wrangler
    this.#shell = options.shell
    this.#options = options.options
    this.#noEnvFile = join(options.folder, "none.env")
    writeFileSync(this.#noEnvFile, "")
  }

  statePathOf(kind: string): string {
    return join(this.folder, "state", kind)
  }

  async run(args: readonly string[], run: WranglerRun = {}): Promise<boolean> {
    const result = await this.#shell.run(this.#command(args, run, {}))
    if (result.status !== 0 && run.mayFail !== true) {
      throw new Error(
        `wrangler ${args.join(" ")} stopped with ${result.status}`
      )
    }
    return result.status === 0
  }

  async read(args: readonly string[]): Promise<ShellResult> {
    return await this.#shell.run(this.#command(args, {}, {}))
  }

  start(args: readonly string[], env: Record<string, string>): Started {
    return this.#shell.start(this.#command(args, {}, env))
  }

  #command(
    args: readonly string[],
    run: WranglerRun,
    env: Record<string, string>
  ): ShellCommand {
    const [command = "wrangler", ...prefix] = this.#wrangler
    return {
      command,
      args: [...prefix, ...args, "--env-file", this.#noEnvFile],
      cwd: gatewayRoot,
      env: { ...this.#environment(run.isPrompt === true), ...env },
      ...(run.stdin === undefined ? {} : { stdin: run.stdin }),
      ...(run.isPrompt === true ? { isPrompt: true } : {}),
    }
  }

  #environment(isPrompt: boolean): Record<string, string> {
    const env: Record<string, string> = {
      HOME: join(this.folder, "home"),
      XDG_CONFIG_HOME: join(this.folder, "config"),
      WRANGLER_SEND_METRICS: "false",
    }
    for (const name of passedVariables) {
      const value = process.env[name]
      if (value !== undefined) {
        env[name] = value
      }
    }
    env.PATH = nodePath(env.PATH ?? "")
    if (!isPrompt) {
      env.CI = "true"
    }
    if (this.#options.account !== null) {
      env.CLOUDFLARE_ACCOUNT_ID = this.#options.account
    }
    return env
  }
}
