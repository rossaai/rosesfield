import type { AssetPlace, Run, RunInputs } from "@rosesfield/contract"

export type ChainRun = {
  inputs: RunInputs
  aspectRatio: string | null
  place?: AssetPlace
}

/** The idempotency key of one step of a chain, from the key of the press that started the chain. */
export function stepKeyOf(key: string, step: string): string {
  return `${key}-${step}`
}

export abstract class RunChain {
  /** Starts a run of an app under a key, with no aspect ratio when null, and held out of the library when its place is held. */
  abstract start(appId: string, request: ChainRun, key: string): Promise<Run>

  /** Waits until a run ends and returns it done, failed or cancelled. */
  abstract settle(run: Run): Promise<Run>
}
