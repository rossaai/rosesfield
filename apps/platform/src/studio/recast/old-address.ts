import type { AppSeeds } from "@/screens/app/use-app-screen"
import { swapHash } from "@/studio/motion/motion-tabs"

const motionAppId = "motion"

const recastAppId = "recast"

export type MotionAddress = {
  to: "/apps/$appId"
  params: { appId: string }
  hash: string
  search: { use?: string }
}

export function motionAddressOf(seeds: Pick<AppSeeds, "use">): MotionAddress {
  return {
    to: "/apps/$appId",
    params: { appId: motionAppId },
    hash: swapHash,
    search: seeds.use === undefined ? {} : { use: seeds.use },
  }
}

export function oldAddressOf(
  appId: string,
  seeds: Pick<AppSeeds, "use">
): MotionAddress | null {
  return appId === recastAppId ? motionAddressOf(seeds) : null
}
