import { startRunBodyFor } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  anchorId,
  askOf,
  callsOf,
  characterId,
  definition,
  nth,
  refusal,
  scenes,
  withKeyframe,
} from "./storyboard-asks"

describe("the rules the Storyboard contract gives every client", () => {
  it("takes a call from a reference, from a character or from keyframe 1", () => {
    const reference = callsOf(askOf(2, { reference: [anchorId] }))
    expect(refusal(nth(reference, 2))).toEqual([])
    expect(
      refusal(nth(callsOf(askOf(2, { character: [characterId] })), 2))
    ).toEqual([])
    expect(refusal(nth(callsOf(askOf(2, {})), 2))).toEqual([])
  })

  it("refuses a reference and a character together", () => {
    const call = nth(
      callsOf(askOf(2, { reference: [anchorId], character: [characterId] })),
      1
    )
    expect(refusal(call)).toEqual(["inputs.character"])
  })

  it("refuses an empty scene inside the scene count, a scene past it and a keyframe past it", () => {
    const empty = askOf(3, { reference: [anchorId] })
    empty.inputs.scene2 = "  "
    expect(refusal(nth(callsOf(empty), 1))).toEqual(["inputs.scene2"])
    const past = askOf(2, { reference: [anchorId] })
    past.inputs.scene3 = scenes[2] ?? ""
    expect(refusal(nth(callsOf(past), 1))).toEqual(["inputs.scene3"])
    const call = nth(callsOf(askOf(2, { reference: [anchorId] })), 2)
    expect(refusal(withKeyframe(call, "3"))).toEqual(["inputs.keyframe"])
  })

  it("makes one keyframe per run and refuses a count of more", () => {
    const call = nth(callsOf(askOf(4, { reference: [anchorId] })), 4)
    expect(startRunBodyFor(definition).parse(call.request).count).toBe(1)
    expect(refusal({ request: { ...call.request, count: 4 } })).toEqual([
      "count",
    ])
  })
})
