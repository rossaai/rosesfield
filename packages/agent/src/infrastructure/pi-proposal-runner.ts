import type { Run } from "@rosesfield/contract"
import { ProposalRunner, type ProposedRuns } from "#domain/proposal-runner.port"
import {
  type KeyframeHandlers,
  keyframeRunsOf,
} from "#infrastructure/pi-keyframe-chain"
import {
  type RunPoll,
  type RunWait,
  timerWait,
} from "#infrastructure/pi-library-tools"
import { isKeyframeChain } from "#infrastructure/pi-run-request"

type PiProposalRunnerOptions = {
  handlers: KeyframeHandlers
  wait?: RunWait
  poll?: RunPoll
}

export class PiProposalRunner extends ProposalRunner {
  private readonly handlers: KeyframeHandlers
  private readonly wait: RunWait
  private readonly poll: RunPoll

  constructor(options: PiProposalRunnerOptions) {
    super()
    this.handlers = options.handlers
    this.wait = options.wait ?? timerWait
    this.poll = options.poll ?? (async () => undefined)
  }

  override async start(proposed: ProposedRuns): Promise<Run[]> {
    if (!isKeyframeChain({ id: proposed.appId })) {
      const { run } = await this.handlers.startRun.execute({
        appId: proposed.appId,
        body: proposed.body,
        idempotencyKey: proposed.key,
        seed: null,
      })
      return [run]
    }
    const runs = await keyframeRunsOf({
      appId: proposed.appId,
      request: proposed.request,
      key: proposed.key,
      handlers: this.handlers,
      wait: this.wait,
      signal: undefined,
      poll: this.poll,
    })
    return runs.flatMap((run) => run ?? [])
  }
}
