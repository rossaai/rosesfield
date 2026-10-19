import type { KeyStatus } from "@rosesfield/contract"
import type {
  AccountAnswer,
  ComfyAccount,
  ProbeAnswer,
} from "@rosesfield/generation"

export type KeyReading = {
  key: KeyStatus
  credits: number | null
}

type Signals = {
  account: AccountAnswer
  jobs: ProbeAnswer | null
  catalog: ProbeAnswer | null
}

const workspacePattern = /workspace/i

function isRefused(answer: ProbeAnswer | null): boolean {
  return answer?.status === 401
}

function hasNoPlan(answer: ProbeAnswer | null): boolean {
  return answer?.status === 402 || answer?.errorType === "insufficient_credits"
}

function isBusy(answer: ProbeAnswer | null): boolean {
  return answer?.status === 429 || answer?.status === 503
}

function isOutsideWorkspace(answer: ProbeAnswer | null): boolean {
  return (
    answer?.status === 403 &&
    answer.errorType === "not_enabled" &&
    workspacePattern.test(answer.detail)
  )
}

export function keyStatusOf(signals: Signals): KeyStatus {
  const { account, jobs, catalog } = signals
  if (account.state === "refused" || isRefused(jobs) || isRefused(catalog)) {
    return "wrong"
  }
  if (hasNoPlan(jobs) || hasNoPlan(catalog)) {
    return "no-plan"
  }
  if (isOutsideWorkspace(catalog)) {
    return "outside-workspace"
  }
  if (isBusy(jobs) || isBusy(catalog)) {
    return "busy"
  }
  if (account.state === "found" || jobs?.status === 404) {
    return "valid"
  }
  return "unreachable"
}

type KeyProbeOptions = {
  account: ComfyAccount
  accountOf?: (key: string) => Promise<AccountAnswer>
}

export class KeyProbe {
  private readonly account: ComfyAccount
  private readonly accountOf: (key: string) => Promise<AccountAnswer>

  constructor(options: KeyProbeOptions) {
    this.account = options.account
    this.accountOf = options.accountOf ?? ((key) => this.account.idOf(key))
  }

  async read(
    key: string,
    credits: "with-credits" | "no-credits" = "with-credits"
  ): Promise<KeyReading> {
    const [account, jobs, catalog, balance] = await Promise.all([
      this.accountOf(key),
      this.account.probeJobs(key),
      this.account.probeCatalog(key),
      credits === "with-credits" ? this.account.creditsOf(key) : null,
    ])
    const status = keyStatusOf({ account, jobs, catalog })
    return { key: status, credits: status === "valid" ? balance : null }
  }
}
