import { randomBytes } from "node:crypto"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { deployOptionsOf } from "../deploy-options"
import {
  type Account,
  type LoginDeployDeps,
  loginDeploy,
} from "../login-deploy"
import {
  ProcessShell,
  type ShellCommand,
  type ShellResult,
} from "../process-shell"

export type Harness = {
  output: string[]
  secrets: string[]
  folders: string[]
  leaks: string[]
  logins: number
  logouts: number
  typedKey: string
}

export type HarnessDeps = {
  wrangler: readonly string[]
  fetch: LoginDeployDeps["fetch"]
  build?: () => Promise<void>
  sleep?: (ms: number) => Promise<void>
  loginFails?: boolean
}

export class TypedShell extends ProcessShell {
  readonly #typed: string

  constructor(options: { write: (text: string) => void; typed: string }) {
    super({ write: options.write })
    this.#typed = options.typed
  }

  override run(command: ShellCommand): Promise<ShellResult> {
    if (command.isPrompt !== true) {
      return super.run(command)
    }
    const { isPrompt: _prompt, ...piped } = command
    return super.run({ ...piped, stdin: this.#typed })
  }
}

export function newHarness(): Harness {
  return {
    output: [],
    secrets: [],
    folders: [],
    leaks: [],
    logins: 0,
    logouts: 0,
    typedKey: `typed-${randomBytes(16).toString("hex")}`,
  }
}

export function testFolder(): string {
  return mkdtempSync(join(tmpdir(), "rosesfield-deploy-test-"))
}

export async function runHarness(
  harness: Harness,
  args: readonly string[],
  deps: HarnessDeps
): Promise<void> {
  const write = (text: string): void => {
    harness.output.push(text)
  }
  await loginDeploy(deployOptionsOf(args), {
    shell: new TypedShell({ write, typed: harness.typedKey }),
    account: accountDouble(harness, deps.loginFails === true),
    wrangler: deps.wrangler,
    makeFolder: () => {
      const folder = testFolder()
      harness.folders.push(folder)
      return folder
    },
    removeFolder: (folder) => {
      harness.leaks.push(...leaksIn(folder, harness.secrets))
      rmSync(folder, { recursive: true, force: true })
    },
    makeSecret: () => {
      const secret = randomBytes(32).toString("hex")
      harness.secrets.push(secret)
      return secret
    },
    fetch: deps.fetch,
    sleep: deps.sleep ?? (() => Promise.resolve()),
    print: (line) => write(`${line}\n`),
    build: deps.build ?? (() => Promise.resolve()),
    localComfyKey: harness.typedKey,
    signal: new AbortController().signal,
  })
}

function accountDouble(harness: Harness, loginFails: boolean): Account {
  return {
    async login(session) {
      harness.logins += 1
      const config = join(session.folder, "config", ".wrangler", "config")
      mkdirSync(config, { recursive: true })
      writeFileSync(join(config, "default.toml"), 'oauth_token = "double"\n')
      if (loginFails) {
        throw new Error("the sign-in was refused")
      }
    },
    async logout() {
      harness.logouts += 1
    },
  }
}

export function leaksIn(folder: string, secrets: readonly string[]): string[] {
  if (!existsSync(folder)) {
    return []
  }
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .filter((file) => {
      const text = readFileSync(file).toString("latin1")
      return secrets.some((secret) => text.includes(secret))
    })
}

export function countIn(text: string, part: string): number {
  return text.split(part).length - 1
}
