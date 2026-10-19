import type { KeyStatus } from "#session/account.contract"
import type {
  AccountAnswer,
  ComfyAccount,
  ProbeAnswer,
} from "#session/comfy-account"

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
  return (
    answer?.status === 402 ||
    answer?.status === 429 ||
    answer?.errorType === "insufficient_credits"
  )
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

  async read(key: string): Promise<KeyReading> {
    const [account, jobs, catalog, credits] = await Promise.all([
      this.accountOf(key),
      this.account.probeJobs(key),
      this.account.probeCatalog(key),
      this.account.creditsOf(key),
    ])
    const status = keyStatusOf({ account, jobs, catalog })
    return { key: status, credits: status === "valid" ? credits : null }
  }
}
