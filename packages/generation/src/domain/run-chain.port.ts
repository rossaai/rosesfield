import type { Run, RunInputs } from "@rosesfield/contract"

export type ChainRun = {
  inputs: RunInputs
  aspectRatio: string | null
}

export abstract class RunChain {
  /** Starts a run of an app under a key, with no aspect ratio when null. */
  abstract start(appId: string, request: ChainRun, key: string): Promise<Run>

  /** Waits until a run ends and returns it done, failed or cancelled. */
  abstract settle(run: Run): Promise<Run>
}
