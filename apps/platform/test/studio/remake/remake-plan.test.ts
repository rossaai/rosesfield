import { describe, expect, it } from "vitest"
import { t, tCatalog } from "@/copy/t"
import {
  planCreditsOf,
  type RemakePlan,
  readPlan,
  readPlanAnswer,
} from "@/studio/remake/remake-plan"
import {
  cameraMoveName,
  shotLengthOf,
  shotSpanOf,
} from "@/studio/remake/shot-words"
import { planOfThree, wirePlanOfThree } from "./remake-fixtures"

describe("the plan the run record carries", () => {
  it("reads every shot with its times, its route, its model, its credits and its seed", () => {
    expect(
      readPlanAnswer({ run: { id: "x", plan: wirePlanOfThree } })
    ).toEqual({ plan: planOfThree })
  })

  it("reads a run with no plan yet as no plan, and a body with no run as unreadable", () => {
    expect(readPlanAnswer({ run: { id: "x" } })).toEqual({ plan: null })
    expect(readPlanAnswer({ run: { id: "x", plan: null } })).toEqual({
      plan: null,
    })
    expect(readPlanAnswer({})).toBeNull()
  })

  it("refuses a plan whose shots are out of order, overlap or end before they start", () => {
    const [first, second, third] = wirePlanOfThree.shots
    expect(readPlan({ shots: [second, first, third] })).toBeNull()
    expect(
      readPlan({ shots: [first, { ...second, startSeconds: 3 }, third] })
    ).toBeNull()
    expect(
      readPlan({ shots: [{ ...first, endSeconds: 0 }, second, third] })
    ).toBeNull()
    expect(readPlan({ shots: [] })).toBeNull()
  })

  it("keeps words and a camera move for a rebuilt shot only", () => {
    const [first, second, third] = wirePlanOfThree.shots
    const read = readPlan({
      shots: [
        { ...first, words: "a street", cameraMove: "push-in" },
        second,
        third,
      ],
    })
    expect(read?.shots[0]).toMatchObject({ words: null, cameraMove: null })
    expect(read?.shots[1]).toMatchObject({
      words: "A wide street at dusk.",
      cameraMove: "push-in",
    })
  })

  it("reads a camera move outside Video's moves as no move", () => {
    const [first, second, third] = wirePlanOfThree.shots
    const read = readPlan({
      shots: [first, { ...second, cameraMove: "spin" }, third],
    })
    expect(read?.shots[1]).toMatchObject({
      words: "A wide street at dusk.",
      cameraMove: null,
    })
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
