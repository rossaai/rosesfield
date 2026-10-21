import {
  type KeyframeChain,
  runKeyframes,
  storyboardAskOf,
} from "@rosesfield/catalog/storyboard"
import type { Run, RunRequest } from "@rosesfield/contract"
import {
  type GetRunHandler,
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

export async function keyframeRunsOf(
  options: KeyframeRunsOptions
): Promise<(Run | null)[]> {
  const { request } = options
  const ask = storyboardAskOf({
    inputs: request.inputs,
    aspectRatio: request.aspectRatio,
    hosted: null,
  })
  if (ask === null) {
    throw new RunInputInvalidError({
      appId: options.appId,
      issues: ["inputs: an asset or a character id is not one"],
    })
  }
  return runKeyframes({ ask, key: options.key, chain: chainOf(options) })
}
