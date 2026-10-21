import { type ChainRun, SpeechChain } from "@rosesfield/catalog/lipsync"
import { type Run, routes } from "@rosesfield/contract"
import { callRoute } from "@/api/call-route"
import { isWorking } from "@/api/queries"

type GatewaySpeechChainOptions = {
  wait: (ms: number) => Promise<void>
  onRun: (run: Run) => void
}

export class GatewaySpeechChain extends SpeechChain {
  static readonly pollMs = 1000

  static readonly maxPolls = 900

  private readonly wait: (ms: number) => Promise<void>
  private readonly onRun: (run: Run) => void

  constructor(options: GatewaySpeechChainOptions) {
    super()
    this.wait = options.wait
    this.onRun = options.onRun
  }

  async start(appId: string, request: ChainRun, key: string): Promise<Run> {
    const answer = await callRoute(routes.startRun, {
      params: { appId },
      body:
        request.aspectRatio === null
          ? { inputs: request.inputs }
          : { inputs: request.inputs, aspectRatio: request.aspectRatio },
      idempotencyKey: key,
    })
    this.onRun(answer.run)
    return answer.run
  }

  async settle(run: Run): Promise<Run> {
    let current = run
    for (
      let polls = 0;
      isWorking(current) && polls < GatewaySpeechChain.maxPolls;
      polls += 1
    ) {
      await this.wait(GatewaySpeechChain.pollMs)
      const answer = await callRoute(routes.getRun, {
        params: { runId: current.id },
      })
      current = answer.run
    }
    return current
  }

  async secondsOf(assetId: string): Promise<number | null> {
    const answer = await callRoute(routes.getAsset, { params: { assetId } })
    return answer.asset.durationSeconds
  }
}
