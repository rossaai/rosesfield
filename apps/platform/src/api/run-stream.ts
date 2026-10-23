import { buildPath, type Run, routes } from "@rosesfield/contract"
import { callRoute, credentialHeaders } from "@/api/call-route"
import { isWorking } from "@/api/queries"

export type Wait = (ms: number, signal: AbortSignal) => Promise<void>

export type RunStreamOptions = {
  runId: string
  onRun: (run: Run) => void
  signal: AbortSignal
  wait?: Wait
}

type Opened = {
  frames: number
  last: Run | null
  refused: number | null
}

const failedOpensBeforeRead = 3

const readAgainMs = 10_000

function waitFor(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = (): void => {
      clearTimeout(timer)
      signal.removeEventListener("abort", done)
      resolve()
    }
    const timer = setTimeout(done, ms)
    signal.addEventListener("abort", done, { once: true })
    if (signal.aborted) {
      done()
    }
  })
}

function runOfBlock(block: string): Run | null {
  const data = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")
  if (data === "") {
    return null
  }
  try {
    const parsed = routes.watchRun.response.safeParse(JSON.parse(data))
    return parsed.success ? parsed.data.run : null
  } catch {
    return null
  }
}

function isFinal(refused: number | null): boolean {
  return refused !== null && refused >= 400 && refused < 500 && refused !== 429
}

async function openOnce(options: RunStreamOptions): Promise<Opened> {
  const opened: Opened = { frames: 0, last: null, refused: null }
  let response: Response
  try {
    response = await fetch(
      buildPath(routes.watchRun.path, { runId: options.runId }),
      {
        headers: { Accept: "text/event-stream", ...credentialHeaders() },
        signal: options.signal,
      }
    )
  } catch {
    return opened
  }
  if (!response.ok || response.body === null) {
    opened.refused = response.status
    await response.body?.cancel().catch(() => undefined)
    return opened
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  try {
    for (
      let chunk = await reader.read();
      !chunk.done;
      chunk = await reader.read()
    ) {
      const text = decoder.decode(chunk.value, { stream: true })
      buffer += text.replace(/\r\n/g, "\n")
      for (let at = buffer.indexOf("\n\n"); at !== -1; ) {
        const run = runOfBlock(buffer.slice(0, at))
        buffer = buffer.slice(at + 2)
        at = buffer.indexOf("\n\n")
        if (run !== null) {
          opened.frames += 1
          opened.last = run
          options.onRun(run)
        }
      }
    }
  } catch {
    return opened
  }
  return opened
}

async function readOnce(options: RunStreamOptions): Promise<Run | null> {
  try {
    const answer = await callRoute(routes.getRun, {
      params: { runId: options.runId },
      signal: options.signal,
    })
    options.onRun(answer.run)
    return answer.run
  } catch {
    return null
  }
}

export async function watchRunStream(options: RunStreamOptions): Promise<void> {
  const wait = options.wait ?? waitFor
  let failures = 0
  while (!options.signal.aborted) {
    const opened = await openOnce(options)
    if (options.signal.aborted || isFinal(opened.refused)) {
      return
    }
    if (opened.last !== null && !isWorking(opened.last)) {
      return
    }
    failures = opened.frames > 1 ? 0 : failures + 1
    if (failures >= failedOpensBeforeRead) {
      failures = 0
      const run = await readOnce(options)
      if (run !== null && !isWorking(run)) {
        return
      }
      await wait(readAgainMs, options.signal)
    }
  }
}
