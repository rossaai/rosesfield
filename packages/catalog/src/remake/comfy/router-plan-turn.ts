import type { Cost } from "@rosesfield/contract"
import {
  creditsUsedOf,
  EngineUnavailableError,
  type Fetch,
  RouterHttp,
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

function costOf(response: Response): Cost | null {
  const credits = creditsUsedOf(response)
  return credits === null
    ? null
    : { amount: credits / comfyCreditsPerUsd, currency: "USD" }
}

export class RouterPlanTurn {
  static readonly timeoutMs = 120_000

  private readonly http: RouterHttp
  private readonly timeoutMs: number

  constructor(options: RouterPlanTurnOptions) {
    this.timeoutMs = options.timeoutMs ?? RouterPlanTurn.timeoutMs
    this.http = new RouterHttp({
      apiKey: options.apiKey,
      fetch: options.fetch ?? ((input, init) => fetch(input, init)),
      timeoutMs: this.timeoutMs,
      downloadTimeoutMs: this.timeoutMs,
    })
  }

  limitMs(): number {
    return this.timeoutMs
  }

  async ask(input: PlanTurnInput, key: string): Promise<PlanTurnAnswer> {
    const response = await this.http.runNow(
      planModel,
      planTurnBodyOf(input),
      key
    )
    let answer: unknown
    try {
      answer = await response.json()
    } catch (error) {
      throw new EngineUnavailableError({ cause: error })
    }
    return { answer, cost: costOf(response) }
  }
}
