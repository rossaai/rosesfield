import { type ChildProcess, spawn } from "node:child_process"

export type ShellCommand = {
  command: string
  args: readonly string[]
  cwd: string
  env: Record<string, string | undefined>
  stdin?: string
  isPrompt?: boolean
}

export type ShellResult = {
  status: number
  output: string
}

export type Started = {
  stop(): Promise<void>
}

export type ShellOptions = {
  write: (text: string) => void
}

export class ProcessShell {
  readonly #write: (text: string) => void

  constructor(options: ShellOptions) {
    this.#write = options.write
  }

  run(command: ShellCommand): Promise<ShellResult> {
    const child = spawn(command.command, command.args, {
      cwd: command.cwd,
      env: command.env,
      stdio: command.isPrompt
        ? "inherit"
        : [command.stdin === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    })
    if (command.stdin !== undefined) {
      child.stdin?.end(command.stdin)
    }
    const chunks: string[] = []
    this.#forward(child, chunks)
    return new Promise((done, fail) => {
      child.once("error", fail)
      child.once("close", (status) =>
        done({ status: status ?? 1, output: chunks.join("") })
      )
    })
  }

  start(command: ShellCommand): Started {
    const child = spawn(command.command, command.args, {
      cwd: command.cwd,
      env: command.env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    })
    this.#forward(child, [])
    const closed = new Promise<void>((done) => {
      child.once("close", () => done())
      child.once("error", () => done())
    })
    return { stop: () => this.#stop(child, closed) }
  }

  #forward(child: ChildProcess, chunks: string[]): void {
    const take = (chunk: Buffer): void => {
      const text = chunk.toString("utf8")
      chunks.push(text)
      this.#write(text)
    }
    child.stdout?.on("data", take)
    child.stderr?.on("data", take)
  }

  async #stop(child: ChildProcess, closed: Promise<void>): Promise<void> {
    if (child.pid === undefined || child.exitCode !== null) {
      return
    }
    signalGroup(child.pid, "SIGTERM")
    const timer = setTimeout(() => {
      if (child.pid !== undefined) {
        signalGroup(child.pid, "SIGKILL")
      }
    }, ProcessShell.stopGraceMs)
    await closed
    clearTimeout(timer)
  }

  static readonly stopGraceMs = 10_000
}

function signalGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(-pid, signal)
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "ESRCH")
    ) {
      throw error
    }
  }
}
