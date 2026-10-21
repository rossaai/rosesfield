import { describe, expect, it } from "vitest"
import { tabOfHash } from "@/studio/motion/motion-tabs"
import { motionAddressOf } from "@/studio/recast/old-address"

describe("the old Recast address", () => {
  it("opens Motion on Swap a character", () => {
    const address = motionAddressOf({ use: undefined })
    expect(address).toEqual({
      to: "/apps/$appId",
      params: { appId: "motion" },
      hash: "swap",
      search: {},
    })
    expect(tabOfHash(address.hash)).toBe("swap")
  })

  it("keeps the file you sent to Recast, so it lands in Motion's well", () => {
    expect(motionAddressOf({ use: "clip-5s" }).search).toEqual({
      use: "clip-5s",
    })
  })
})
