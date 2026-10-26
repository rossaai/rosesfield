import {
  type KeyframeChain,
  keyframeCallsOf,
  runKeyframes,
  type StoryboardAsk,
  storyboardAskOf,
} from "@rosesfield/catalog/storyboard"
import type { Run, RunRequest } from "@rosesfield/contract"
import {
  type GetRunHandler,
  type PriceRunHandler,
  RunInputInvalidError,
  type StartRunHandler,
} from "@rosesfield/generation"
import {
  type RunPoll,
  type RunWait,
  readRunToEnd,
} from "#infrastructure/pi-library-tools"

export type KeyframeHandlers = {
  startRun: StartRunHandler
  getRun: GetRunHandler
}

type KeyframeRunsOptions = {
  appId: string
  request: RunRequest
  key: string
  handlers: KeyframeHandlers
  wait: RunWait
  signal: AbortSignal | undefined
  poll?: RunPoll
}

function chainOf(options: KeyframeRunsOptions): KeyframeChain {
  const { handlers, wait, signal, poll } = options
  return {
    start: async (appId, request, key) => {
      const { run } = await handlers.startRun.execute({
        appId,
        body:
          request.aspectRatio === null
            ? { inputs: request.inputs }
            : { inputs: request.inputs, aspectRatio: request.aspectRatio },
        idempotencyKey: key,
        seed: null,
      })
      return run
    },
    settle: async (run) => {
      const read = await readRunToEnd(
        handlers.getRun,
        run.id,
        wait,
        signal,
        poll
      )
      return read.run
    },
  }
}

export function chainAskOf(appId: string, request: RunRequest): StoryboardAsk {
  const ask = storyboardAskOf({
    inputs: request.inputs,
    aspectRatio: request.aspectRatio,
    hosted: null,
  })
  if (ask === null) {
    throw new RunInputInvalidError({
      appId,
      issues: ["inputs: an asset or a character id is not one"],
    })
  }
  return ask
}

export async function keyframeCreditsOf(
  appId: string,
  ask: StoryboardAsk,
  priceRun: PriceRunHandler
): Promise<number | null> {
  const { prices } = await priceRun.executeAll({
    appId,
    asks: keyframeCallsOf(ask).map((call) => call.request),
  })
  let total = 0
  for (const price of prices) {
    if (price.credits === null) {
      return null
    }
    total += price.credits
  }
  return total
}

export async function keyframeRunsOf(
  options: KeyframeRunsOptions
): Promise<(Run | null)[]> {
  const ask = chainAskOf(options.appId, options.request)
  return runKeyframes({ ask, key: options.key, chain: chainOf(options) })
}
