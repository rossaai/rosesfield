import type { Cost } from "@rosesfield/contract"
import {
  ComfyRouterGenerationEngine,
  EngineKeyInvalidError,
  EngineNoCreditsError,
  EngineNotEnabledError,
  EngineRateLimitedError,
  EngineUnavailableError,
  type Fetch,
  RunFailedError,
} from "@rosesfield/generation"
import { comfyCreditsPerUsd } from "#comfy/comfy-credits"
import {
  type PlanTurnInput,
  planModel,
  planTurnBodyOf,
} from "#remake/comfy/remake-plan-turn"

export type PlanTurnAnswer = {
  answer: unknown
  cost: Cost | null
}

type RouterPlanTurnOptions = {
  apiKey: string | null
  fetch?: Fetch
  timeoutMs?: number
}

function refusalOf(response: Response): Error {
  const status = response.status
  if (status === 401) {
    return new EngineKeyInvalidError({ cause: status })
  }
  if (status === 402) {
    return new EngineNoCreditsError({ cause: status })
  }
  if (status === 403) {
    return new EngineNotEnabledError({ cause: status })
  }
  if (status === 429) {
    const seconds = Number(response.headers.get("retry-after"))
    return new EngineRateLimitedError({
      retryAfterSeconds:
        Number.isFinite(seconds) && seconds > 0 ? seconds : null,
      cause: status,
    })
  }
  return status >= 500
    ? new EngineUnavailableError({ cause: status })
    : new RunFailedError({ cause: `the plan turn answered ${status}` })
}

function costOf(response: Response): Cost | null {
  const credits = Number(response.headers.get("x-comfy-credits-used"))
  return Number.isFinite(credits) && credits > 0
    ? { amount: credits / comfyCreditsPerUsd, currency: "USD" }
    : null
}

export class RouterPlanTurn {
  static readonly timeoutMs = 120_000

  private readonly apiKey: string | null
  private readonly send: Fetch
  private readonly timeoutMs: number

  constructor(options: RouterPlanTurnOptions) {
    this.apiKey = options.apiKey
    this.send = options.fetch ?? ((input, init) => fetch(input, init))
    this.timeoutMs = options.timeoutMs ?? RouterPlanTurn.timeoutMs
  }

  limitMs(): number {
    return this.timeoutMs
  }

  async ask(input: PlanTurnInput, key: string): Promise<PlanTurnAnswer> {
    if (this.apiKey === null) {
      throw new EngineKeyInvalidError({ cause: "no key for the plan turn" })
    }
    let response: Response
    try {
      response = await this.send(
        `${ComfyRouterGenerationEngine.routerUrl}/v2/models/${planModel}`,
        {
          method: "POST",
          headers: {
            "X-API-Key": this.apiKey,
            "Content-Type": "application/json",
            "Idempotency-Key": key,
          },
          body: JSON.stringify(planTurnBodyOf(input)),
          signal: AbortSignal.timeout(this.timeoutMs),
        }
      )
    } catch (error) {
      throw new EngineUnavailableError({ cause: error })
    }
    if (!response.ok) {
      throw refusalOf(response)
    }
    let answer: unknown
    try {
      answer = await response.json()
    } catch (error) {
      throw new EngineUnavailableError({ cause: error })
    }
    return { answer, cost: costOf(response) }
  }
}
