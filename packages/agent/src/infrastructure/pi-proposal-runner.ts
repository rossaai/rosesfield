import type { Run } from "@rosesfield/contract"
import { ProposalRunner, type ProposedRuns } from "#domain/proposal-runner.port"
import { keyframeRunsOf } from "#infrastructure/pi-keyframe-chain"
import {
  type RunPoll,
  type RunWait,
  timerWait,
} from "#infrastructure/pi-library-tools"
import {
  isOwnVideoRun,
  namedDraftOf,
  type OwnVideoHandlers,
  ownVideoDraftOf,
  ownVideoFinalOf,
} from "#infrastructure/pi-own-video-chain"
import { isKeyframeChain } from "#infrastructure/pi-run-request"

type PiProposalRunnerOptions = {
  handlers: OwnVideoHandlers
  wait?: RunWait
  poll?: RunPoll
}

export class PiProposalRunner extends ProposalRunner {
  private readonly handlers: OwnVideoHandlers
  private readonly wait: RunWait
  private readonly poll: RunPoll

  constructor(options: PiProposalRunnerOptions) {
    super()
    this.handlers = options.handlers
    this.wait = options.wait ?? timerWait
    this.poll = options.poll ?? (async () => undefined)
  }

  override async start(proposed: ProposedRuns): Promise<Run[]> {
    if (isOwnVideoRun(proposed.appId, proposed.request.inputs)) {
      return this.ownVideo(proposed)
    }
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

  /** Your own video's draft, or after your yes the final of the draft the call named. */
  private async ownVideo(proposed: ProposedRuns): Promise<Run[]> {
    const runs = {
      handlers: this.handlers,
      request: proposed.request,
      key: proposed.key,
      wait: this.wait,
      signal: undefined,
      poll: this.poll,
    }
    const draft = namedDraftOf(proposed.request.inputs)
    const answer =
      draft === null
        ? await ownVideoDraftOf(runs)
        : await ownVideoFinalOf(runs, draft)
    return [answer.run]
  }
}
