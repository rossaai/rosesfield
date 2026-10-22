import type { Run, RunInputs } from "@rosesfield/contract"

export type ChainRun = {
  inputs: RunInputs
  aspectRatio: string | null
}

export abstract class SpeechChain {
  /** Starts a run of an app under a key, with no aspect ratio when null. */
  abstract start(appId: string, request: ChainRun, key: string): Promise<Run>

  /** Waits until a run ends and returns it done, failed or cancelled. */
  abstract settle(run: Run): Promise<Run>

  /** Reads the length in seconds of an asset, or null when it holds none. */
  abstract secondsOf(assetId: string): Promise<number | null>
}
