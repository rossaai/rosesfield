import { type ChainRun, RunChain } from "@rosesfield/catalog/motion"
import { type Run, routes } from "@rosesfield/contract"
import { callRoute } from "@/api/call-route"
import { isWorking } from "@/api/queries"

type GatewayRunChainOptions = {
  wait: (ms: number) => Promise<void>
  onRun: (run: Run) => void
}

/** Starts each run of a chain through the gateway's start-run route under its own key, and reads it until it ends. */
export class GatewayRunChain extends RunChain {
  static readonly pollMs = 1000

  static readonly maxPolls = 900

  private readonly wait: (ms: number) => Promise<void>
  private readonly onRun: (run: Run) => void

  constructor(options: GatewayRunChainOptions) {
    super()
    this.wait = options.wait
    this.onRun = options.onRun
  }

  async start(appId: string, request: ChainRun, key: string): Promise<Run> {
    const answer = await callRoute(routes.startRun, {
      params: { appId },
      body: {
        inputs: request.inputs,
        ...(request.aspectRatio === null
          ? {}
          : { aspectRatio: request.aspectRatio }),
        ...(request.place === undefined ? {} : { place: request.place }),
      },
      idempotencyKey: key,
    })
    this.onRun(answer.run)
    return answer.run
  }

  async settle(run: Run): Promise<Run> {
    let current = run
    for (
      let polls = 0;
      isWorking(current) && polls < GatewayRunChain.maxPolls;
      polls += 1
    ) {
      await this.wait(GatewayRunChain.pollMs)
      const answer = await callRoute(routes.getRun, {
        params: { runId: current.id },
      })
      current = answer.run
    }
    return current
  }
}
