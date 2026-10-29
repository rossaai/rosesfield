import type { Cost } from "@rosesfield/contract"
import {
  creditsUsedOf,
  EngineUnavailableError,
  type Fetch,
  RouterHttp,
} from "@rosesfield/generation"
import { comfyCreditsPerUsd } from "#comfy/comfy-credits"
import { type ClipPlan, clipPlanLimits, planClip } from "#motion/clip-plan"
import { ClipPlanUnreadableError } from "#motion/clip-plan-unreadable.error"
import {
  type ClipPlanInput,
  clipPlanBodyOf,
  clipPlanReplyOf,
  clipPlanRoute,
} from "#motion/comfy/clip-plan-turn"

export type ClipPlanAnswer = {
  plan: ClipPlan
  cost: Cost | null
  attempts: number
}

type RouterClipPlanTurnOptions = {
  apiKey: string | null
  fetch?: Fetch
  timeoutMs?: number
  maxRetries?: number
}

function costOf(response: Response): Cost | null {
  const credits = creditsUsedOf(response)
  return credits === null
    ? null
    : { amount: credits / comfyCreditsPerUsd, currency: "USD" }
}

function checkInput(input: ClipPlanInput): void {
  if (
    input.frames.length !== clipPlanLimits.frames ||
    input.photos.length === 0 ||
    input.photos.length > clipPlanLimits.mostPhotos ||
    input.sentence.length > clipPlanLimits.longestSentence
  ) {
    throw new ClipPlanUnreadableError({
      cause: `${input.frames.length} frames and ${input.photos.length} photos`,
    })
  }
}

/** The plan of a Motion clip: one bound call of the Router's chat route on the person's key. */
export class RouterClipPlanTurn {
  static readonly timeoutMs = 60_000
  static readonly maxRetries = 2

  private readonly http: RouterHttp
  private readonly maxRetries: number

  constructor(options: RouterClipPlanTurnOptions) {
    const timeoutMs = options.timeoutMs ?? RouterClipPlanTurn.timeoutMs
    this.maxRetries = options.maxRetries ?? RouterClipPlanTurn.maxRetries
    this.http = new RouterHttp({
      apiKey: options.apiKey,
      fetch: options.fetch ?? ((input, init) => fetch(input, init)),
      timeoutMs,
      downloadTimeoutMs: timeoutMs,
    })
  }

  async ask(input: ClipPlanInput, key: string): Promise<ClipPlanAnswer> {
    checkInput(input)
    const body = clipPlanBodyOf(input)
    for (let attempt = 1; ; attempt += 1) {
      try {
        const response = await this.http.runNow(clipPlanRoute, body, key)
        const answer: unknown = await response.json().catch((error) => {
          throw new EngineUnavailableError({ cause: error })
        })
        const plan = planClip(clipPlanReplyOf(answer), input.photos.length)
        return { plan, cost: costOf(response), attempts: attempt }
      } catch (error) {
        const isRetried =
          error instanceof EngineUnavailableError && attempt <= this.maxRetries
        if (!isRetried) {
          throw error
        }
      }
    }
  }
}
