import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import { RunFailedError } from "@rosesfield/generation"
import {
  type MediaResult,
  type MediaRun,
  MediaTool,
} from "#remake/media-tool.port"

type BunMediaToolOptions = {
  timeoutMs?: number
}

const tools: readonly string[] = ["ffmpeg", "ffprobe"]

const stderrKept = 600

function nameOf(name: string): string {
  if (basename(name) !== name || name.startsWith(".")) {
    throw new RunFailedError({
      cause: `a media file name with a path: ${name}`,
    })
  }
  return name
}

export class BunMediaTool extends MediaTool {
  static readonly timeoutMs = 120_000

  private readonly timeoutMs: number

  constructor(options: BunMediaToolOptions = {}) {
    super()
    this.timeoutMs = options.timeoutMs ?? BunMediaTool.timeoutMs
  }

  override limitMs(): number {
    return this.timeoutMs
  }

  override async run(run: MediaRun): Promise<MediaResult> {
    const [tool] = run.args
    if (tool === undefined || !tools.includes(tool)) {
      throw new RunFailedError({ cause: `not a media tool: ${tool}` })
    }
    const folder = await mkdtemp(join(tmpdir(), "rosesfield-remake-"))
    try {
      await Promise.all(
        run.inputs.map((file) =>
          writeFile(join(folder, nameOf(file.name)), file.bytes)
        )
      )
      const child = Bun.spawn([...run.args], {
        cwd: folder,
        stdin: "ignore",
        stdout: "pipe",
        stderr: "pipe",
        timeout: this.timeoutMs,
      })
      const [stdout, stderr, exit] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ])
      if (exit !== 0) {
        throw new RunFailedError({
          cause: `${tool} ended with ${exit}: ${stderr.slice(-stderrKept)}`,
        })
      }
      const outputs = await Promise.all(
        run.outputs.map(
          async (name) =>
            [
              name,
              new Uint8Array(await readFile(join(folder, nameOf(name)))),
            ] as const
        )
      )
      return { stdout, outputs: new Map(outputs) }
    } finally {
      await rm(folder, { recursive: true, force: true })
    }
  }
}
