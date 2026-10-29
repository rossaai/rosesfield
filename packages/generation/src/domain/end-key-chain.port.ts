import type { AssetKind } from "@rosesfield/contract"
import { RunChain } from "#domain/run-chain.port"

export abstract class EndKeyChain extends RunChain {
  /** Reads the kind of an asset, or null when no asset has the id. */
  abstract kindOf(assetId: string): Promise<AssetKind | null>
}
