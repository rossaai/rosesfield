import { describe, expect, it } from "vitest"
import { tabOfHash } from "@/studio/motion/motion-tabs"
import { motionAddressOf, oldAddressOf } from "@/studio/recast/old-address"

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

  it("sends the Recast address to Motion on Swap a character with your file", () => {
    expect(oldAddressOf("recast", { use: "clip-5s" })).toEqual({
      to: "/apps/$appId",
      params: { appId: "motion" },
      hash: "swap",
      search: { use: "clip-5s" },
    })
  })

  it("leaves every other app's address alone", () => {
    expect(oldAddressOf("motion", { use: undefined })).toBeNull()
    expect(oldAddressOf("video-edit", { use: "clip-5s" })).toBeNull()
  })
})

describe("the old Effects address", () => {
  it("opens Motion on its Library, where the effects are examples", () => {
    expect(oldAddressOf("effects", { use: "photo-1" })).toEqual({
      to: "/apps/$appId",
      params: { appId: "motion" },
      hash: "",
      search: { tab: "library" },
    })
  })
})
