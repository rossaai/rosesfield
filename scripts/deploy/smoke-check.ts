export type Probe = {
  path: string
  status: number
  token?: string
}

export type SmokeCheckOptions = {
  address: string
  probes: readonly Probe[]
  attempts: number
  intervalMs: number
  fetch: (url: string, init: RequestInit) => Promise<Response>
  sleep: (ms: number) => Promise<void>
  print: (line: string) => void
}

const probeTimeoutMs = 15_000

export async function smokeCheck(options: SmokeCheckOptions): Promise<void> {
  for (const probe of options.probes) {
    await checkProbe(options, probe)
  }
}

export function probeText(probe: Probe): string {
  const holder = probe.token === undefined ? "" : " with the owner token"
  return `${probe.path}${holder} answers ${probe.status}`
}

async function checkProbe(
  options: SmokeCheckOptions,
  probe: Probe
): Promise<void> {
  let answer = "no answer"
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    const status = await statusOf(options, probe)
    if (status === probe.status) {
      options.print(`${options.address}${probeText(probe)}: yes`)
      return
    }
    answer = status === null ? "no answer" : `${status}`
    if (attempt < options.attempts) {
      await options.sleep(options.intervalMs)
    }
  }
  throw new Error(
    `${options.address}${probe.path} answered ${answer}, and the check needs ${probe.status}.`
  )
}

async function statusOf(
  options: SmokeCheckOptions,
  probe: Probe
): Promise<number | null> {
  const headers: Record<string, string> =
    probe.token === undefined ? {} : { authorization: `Bearer ${probe.token}` }
  try {
    const response = await options.fetch(`${options.address}${probe.path}`, {
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(probeTimeoutMs),
    })
    await response.body?.cancel()
    return response.status
  } catch {
    return null
  }
}
