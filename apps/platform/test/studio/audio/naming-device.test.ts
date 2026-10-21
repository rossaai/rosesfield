import { describe, expect, it } from "vitest"
import { NamingDevice } from "@/studio/audio/naming-device"
import { FakeDevice } from "../edit/fake-device"

describe("the device a recording well picks through", () => {
  it("hands the picked files to the well and to the namer", async () => {
    const take = new File(["take"], "take.wav", { type: "audio/wav" })
    const inner = new FakeDevice({ files: [take] })
    const seen: (readonly File[])[] = []
    const device = new NamingDevice({
      inner,
      onPick: (files) => seen.push(files),
    })
    const picked = await device.pickFiles({
      accept: ["audio/*"],
      multiple: false,
    })
    expect(picked).toEqual([take])
    expect(seen).toEqual([[take]])
    expect(inner.picks).toEqual([{ accept: ["audio/*"], multiple: false }])
  })
})
