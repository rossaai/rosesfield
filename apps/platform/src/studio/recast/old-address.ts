import { swapHash } from "@/studio/motion/motion-tabs"

const motionAppId = "motion"

const recastAppId = "recast"

const effectsAppId = "effects"

export type MotionAddress = {
  to: "/apps/$appId"
  params: { appId: string }
  hash: string
  search: { use?: string; tab?: "library" }
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

export const libraryAddress: MotionAddress = {
  to: "/apps/$appId",
  params: { appId: motionAppId },
  hash: "",
  search: { tab: "library" },
}

export function oldAddressOf(
  appId: string,
  seeds: Seeds
): MotionAddress | null {
  if (appId === effectsAppId) {
    return libraryAddress
  }
  return appId === recastAppId ? motionAddressOf(seeds) : null
}
