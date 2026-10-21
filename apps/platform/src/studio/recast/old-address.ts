import { swapHash } from "@/studio/motion/motion-tabs"

const motionAppId = "motion"

const recastAppId = "recast"

export type MotionAddress = {
  to: "/apps/$appId"
  params: { appId: string }
  hash: string
  search: { use?: string }
}

type Seeds = { use?: string | undefined }

export function motionAddressOf(seeds: Seeds): MotionAddress {
  return {
    to: "/apps/$appId",
    params: { appId: motionAppId },
    hash: swapHash,
    search: seeds.use === undefined ? {} : { use: seeds.use },
  }
}

export function oldAddressOf(
  appId: string,
  seeds: Seeds
): MotionAddress | null {
  return appId === recastAppId ? motionAddressOf(seeds) : null
}
