import { describe, expect, it } from "vitest"
import {
  checkShots,
  type FoundShot,
  planShots,
  routeOf,
} from "#remake/shot-plan"

function evenShots(count: number, seconds: number): FoundShot[] {
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    startSeconds: index * seconds,
    endSeconds: (index + 1) * seconds,
  }))
}

describe("the shot limits of one Remake run", () => {
  it("takes an edit of 6 shots of 2 seconds", () => {
    expect(checkShots(evenShots(6, 2))).toBeNull()
  })

  it("refuses an edit of 1 shot and one of 9 shots by their count", () => {
    expect(checkShots(evenShots(1, 5))).toEqual({ code: "shotCount", count: 1 })
    expect(checkShots(evenShots(9, 1))).toEqual({ code: "shotCount", count: 9 })
  })

  it("refuses an edit with a shot of 7 seconds and names the shot", () => {
    const shots: FoundShot[] = [
      { number: 1, startSeconds: 0, endSeconds: 3 },
      { number: 2, startSeconds: 3, endSeconds: 10 },
    ]
    expect(checkShots(shots)).toEqual({
      code: "shotLength",
      number: 2,
      seconds: 7,
    })
  })

  it("refuses a shot shorter than 1 second", () => {
    const shots: FoundShot[] = [
      { number: 1, startSeconds: 0, endSeconds: 0.5 },
      { number: 2, startSeconds: 0.5, endSeconds: 3 },
    ]
    expect(checkShots(shots)).toMatchObject({ code: "shotLength", number: 1 })
  })

  it("refuses an edit of 6 shots of 5 seconds by its length", () => {
    expect(checkShots(evenShots(6, 5))).toEqual({
      code: "editLength",
      seconds: 30,
    })
  })

  it("takes an edit of 3 shots of 4 seconds, 12 seconds in all", () => {
    expect(checkShots(evenShots(3, 4))).toBeNull()
  })
})

describe("the plan of one Remake run", () => {
  const shots = evenShots(2, 2)

  it("routes a shot with one person to your character, whatever otherShots says", () => {
    expect(routeOf("one", "keep")).toBe("replace")
    expect(routeOf("none", "keep")).toBe("keep")
    expect(routeOf("several", "rebuild")).toBe("rebuild")
  })

  it("keeps words and a move only on a rebuilt shot", () => {
    const plan = planShots(
      shots,
      {
        shots: [
          { people: "one", words: "A person runs.", cameraMove: "static" },
          { people: "none", words: "An empty road.", cameraMove: "crane-up" },
        ],
      },
      "rebuild"
    )
    expect(plan).toEqual([
      {
        ...shots[0],
        people: "one",
        route: "replace",
        words: null,
        cameraMove: null,
      },
      {
        ...shots[1],
        people: "none",
        route: "rebuild",
        words: "An empty road.",
        cameraMove: "crane-up",
      },
    ])
  })

  it("refuses a plan with a different shot count from the cut finder's", () => {
    const reply = {
      shots: [{ people: "none", words: "An empty road.", cameraMove: null }],
    }
    expect(planShots(shots, reply, "rebuild")).toBeNull()
  })

  it("refuses a plan that rebuilds a shot with no words, and takes the same shot kept", () => {
    const reply = {
      shots: [
        { people: "one", words: null, cameraMove: null },
        { people: "none", words: " ", cameraMove: "static" },
      ],
    }
    expect(planShots(shots, reply, "rebuild")).toBeNull()
    expect(planShots(shots, reply, "keep")?.map((shot) => shot.route)).toEqual([
      "replace",
      "keep",
    ])
  })

  it("refuses a plan with a camera move outside Video's list", () => {
    const reply = {
      shots: [
        { people: "one", words: null, cameraMove: null },
        { people: "none", words: "An empty road.", cameraMove: "spin" },
      ],
    }
    expect(planShots(shots, reply, "rebuild")).toBeNull()
  })
})
