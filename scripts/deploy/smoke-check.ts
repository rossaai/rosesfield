export type Probe = {
  path: string
  status: number
  token?: string
  capCredits?: string
}

export type SmokeCheckOptions = {
  address: string
  probes: readonly Probe[]
  attempts: number
  intervalMs: number
  fetch: (url: string, init: RequestInit) => Promise<Response>
  sleep: (ms: number) => Promise<void>
  print: (line: string) => void
  signal: AbortSignal
}

type Answer = {
  status: number
  capCredits: number | null
}

const probeTimeoutMs = 15_000

export async function smokeCheck(options: SmokeCheckOptions): Promise<void> {
  for (const probe of options.probes) {
    await checkProbe(options, probe)
  }
}

export function probeText(probe: Probe): string {
  const holder = probe.token === undefined ? "" : " with the owner token"
  const cap =
    probe.capCredits === undefined
      ? ""
      : ` with a cap of ${probe.capCredits} credits`
  return `${probe.path}${holder} answers ${probe.status}${cap}`
}

export function throwIfStopped(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new Error("Stopped by a signal before the next step.")
  }
}

async function checkProbe(
  options: SmokeCheckOptions,
  probe: Probe
): Promise<void> {
  let seen = "no answer"
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    throwIfStopped(options.signal)
    const answer = await answerOf(options, probe)
    if (answer !== null && isExpected(probe, answer)) {
      options.print(`${options.address}${probeText(probe)}: yes`)
      return
    }
    seen = describe(answer)
    if (attempt < options.attempts) {
      await sleepUnlessStopped(options)
    }
  }
  throw new Error(
    `${options.address}${probe.path} answered ${seen}, and the check needs ${probeText(probe)}.`
  )
}

function isExpected(probe: Probe, answer: Answer): boolean {
  return (
    answer.status === probe.status &&
    (probe.capCredits === undefined ||
      answer.capCredits === Number(probe.capCredits))
  )
}

function describe(answer: Answer | null): string {
  if (answer === null) {
    return "no answer"
  }
  return answer.capCredits === null
    ? `${answer.status}`
    : `${answer.status} with a cap of ${answer.capCredits} credits`
}

async function sleepUnlessStopped(options: SmokeCheckOptions): Promise<void> {
  if (options.signal.aborted) {
    return
  }
  await Promise.race([
    options.sleep(options.intervalMs),
    new Promise<void>((done) => {
      options.signal.addEventListener("abort", () => done(), { once: true })
    }),
  ])
}

async function answerOf(
  options: SmokeCheckOptions,
  probe: Probe
): Promise<Answer | null> {
  const headers: Record<string, string> =
    probe.token === undefined ? {} : { authorization: `Bearer ${probe.token}` }
  try {
    const response = await options.fetch(`${options.address}${probe.path}`, {
      headers,
      redirect: "manual",
      signal: AbortSignal.any([
        options.signal,
        AbortSignal.timeout(probeTimeoutMs),
      ]),
    })
    if (probe.capCredits === undefined) {
      await response.body?.cancel()
      return { status: response.status, capCredits: null }
    }
    return { status: response.status, capCredits: capOf(await response.text()) }
  } catch {
    return null
  }
}

function capOf(text: string): number | null {
  try {
    const parsed: unknown = JSON.parse(text)
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "account" in parsed &&
      typeof parsed.account === "object" &&
      parsed.account !== null &&
      "cap" in parsed.account &&
      typeof parsed.account.cap === "object" &&
      parsed.account.cap !== null &&
      "credits" in parsed.account.cap &&
      typeof parsed.account.cap.credits === "number"
    ) {
      return parsed.account.cap.credits
    }
    return null
  } catch {
    return null
  }
}
