import { RunChain } from "@rosesfield/generation/bindings"

export type { ChainRun } from "@rosesfield/generation/bindings"

export abstract class SpeechChain extends RunChain {
  /** Reads the length in seconds of an asset, or null when it holds none. */
  abstract secondsOf(assetId: string): Promise<number | null>
}
