import type { Run } from "@rosesfield/contract"
import { describe, expect, expectTypeOf, it } from "vitest"
import { t, tCatalog } from "@/copy/t"
import { planCreditsOf, type RemakePlan } from "@/studio/remake/remake-plan"
import {
  cameraMoveName,
  shotLengthOf,
  shotSpanOf,
} from "@/studio/remake/shot-words"
import { planOfThree, remakeRun } from "./remake-fixtures"

describe("the plan the run record carries", () => {
  it("is the run's own plan type, with no second type to parse into", () => {
    expectTypeOf<RemakePlan>().toEqualTypeOf<NonNullable<Run["plan"]>>()
    const plan: RemakePlan | undefined = remakeRun({ plan: planOfThree }).plan
    expect(plan).toEqual(planOfThree)
  })
})

describe("the plan's price", () => {
  it("is the sum of the credits of its shots, with a kept shot costing nothing", () => {
    expect(planCreditsOf(planOfThree)).toBe(12.5)
  })

  it("is unknown when a shot that makes a call has no price", () => {
    const unpriced: RemakePlan = {
      shots: planOfThree.shots.map((shot) =>
        shot.number === 2 ? { ...shot, credits: null } : shot
      ),
    }
    expect(planCreditsOf(unpriced)).toBeNull()
  })
})

describe("the words of a shot", () => {
  it("says a shot's length in seconds at the nearest frame, and its span", () => {
    const [first, second] = planOfThree.shots
    if (first === undefined || second === undefined) {
      throw new Error("no shot")
    }
    expect(shotLengthOf(first)).toBe("4 seconds")
    expect(shotLengthOf(second)).toBe("3.5 seconds")
    expect(shotSpanOf(second)).toBe(
      t("model.tag.length", { min: "4", max: "7.5" })
    )
  })

  it("names a camera move with Video's own words, and no name for a move Video lacks", () => {
    expect(cameraMoveName("push-in")).toBe(
      tCatalog("video.choice.cameraMove.pushIn")
    )
    expect(cameraMoveName("spin")).toBeNull()
  })
})
