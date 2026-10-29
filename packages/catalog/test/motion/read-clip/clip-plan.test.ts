import type { ProjectError } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { planClip, trackTextOf } from "#motion/clip-plan"
import { ClipPlanNoTargetError } from "#motion/clip-plan-no-target.error"
import { ClipPlanUnreadableError } from "#motion/clip-plan-unreadable.error"
import { noTargetPlan, twoTargetPlan } from "./clip-plan-answers"

function refusalOf(reply: unknown, photos: number): unknown {
  try {
    planClip(reply, photos)
  } catch (error) {
    return error
  }
  return null
}

describe("the plan of a clip", () => {
  it("reads two targets, numbers their photos from 0 and names the photo nothing uses", () => {
    const plan = planClip(twoTargetPlan, 3)
    expect(plan.targets).toEqual([
      { ...twoTargetPlan.targets[0], photos: [0] },
      { ...twoTargetPlan.targets[1], photos: [2] },
    ])
    expect(plan.unusedPhotos).toEqual([1])
    expect(plan.editPrompt).toBe(twoTargetPlan.editPrompt)
    expect(plan.scene).toBe(twoTargetPlan.scene)
  })

  it("joins the targets into one text the tracker splits at each comma", () => {
    expect(trackTextOf(planClip(twoTargetPlan, 3))).toBe(
      "the man in the grey coat, the bottle in his right hand"
    )
  })

  it("refuses a plan with no target as a refusal about the inputs, before any GPU runs", () => {
    const refusal = refusalOf(noTargetPlan, 2)
    expect(refusal).toBeInstanceOf(ClipPlanNoTargetError)
    expect((refusal as ProjectError).code).toBe("MOTION_NOTHING_TO_CHANGE")
    expect((refusal as ProjectError).status).toBe(400)
  })

  it("refuses a plan whose only target names photos the person did not add", () => {
    const outside = {
      ...twoTargetPlan,
      targets: [{ ...twoTargetPlan.targets[0], photos: [4, 5] }],
    }
    expect(refusalOf(outside, 3)).toBeInstanceOf(ClipPlanNoTargetError)
  })

  it("control: the same plan with one photo in range keeps that target", () => {
    const inside = {
      ...twoTargetPlan,
      targets: [{ ...twoTargetPlan.targets[0], photos: [4, 2] }],
    }
    expect(planClip(inside, 3).targets[0]?.photos).toEqual([1])
  })

  it.each([
    [
      "a target that holds a comma",
      {
        ...twoTargetPlan,
        targets: [{ ...twoTargetPlan.targets[0], find: "the man, left" }],
      },
    ],
    [
      "4 targets",
      {
        ...twoTargetPlan,
        targets: Array(4).fill(twoTargetPlan.targets[0]),
      },
    ],
    [
      "a scene that names the control",
      { ...twoTargetPlan, scene: "Follow the depth map of the clip." },
    ],
    [
      "a scene that names the control by that word",
      { ...twoTargetPlan, scene: "The control keeps the camera steady." },
    ],
    [
      "a scene that says the guide leads the camera",
      { ...twoTargetPlan, scene: "The camera follows the guide." },
    ],
    [
      "a scene that names a technique",
      { ...twoTargetPlan, scene: "A swap technique puts her in the coat." },
    ],
    [
      "a scene that says the move is guided",
      { ...twoTargetPlan, scene: "A guided dolly move to the left." },
    ],
    ["an empty edit prompt", { ...twoTargetPlan, editPrompt: " " }],
    ["a field the schema lacks", { ...twoTargetPlan, camera: "static" }],
    ["no JSON", null],
  ])("refuses %s as an unreadable plan", (_, reply) => {
    const refusal = refusalOf(reply, 3)
    expect(refusal).toBeInstanceOf(ClipPlanUnreadableError)
    expect((refusal as ProjectError).code).toBe("MOTION_PLAN_UNREADABLE")
  })
})
