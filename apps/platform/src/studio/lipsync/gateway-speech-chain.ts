import { type ChainRun, SpeechChain } from "@rosesfield/catalog/lipsync"
import { type Run, routes } from "@rosesfield/contract"
import { callRoute } from "@/api/call-route"
import { GatewayRunChain } from "@/api/gateway-run-chain"

type GatewaySpeechChainOptions = {
  wait: (ms: number) => Promise<void>
  onRun: (run: Run) => void
}

export class GatewaySpeechChain extends SpeechChain {
  static readonly pollMs = GatewayRunChain.pollMs

  static readonly maxPolls = GatewayRunChain.maxPolls

  private readonly runs: GatewayRunChain

  constructor(options: GatewaySpeechChainOptions) {
    super()
    this.runs = new GatewayRunChain(options)
  }

  start(appId: string, request: ChainRun, key: string): Promise<Run> {
    return this.runs.start(appId, request, key)
  }

  settle(run: Run): Promise<Run> {
    return this.runs.settle(run)
  }

  async secondsOf(assetId: string): Promise<number | null> {
    const answer = await callRoute(routes.getAsset, { params: { assetId } })
    return answer.asset.durationSeconds
  }
}
