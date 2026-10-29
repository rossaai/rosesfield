import {
  appDefinition,
  type InputDefinition,
  startRunBodyFor,
} from "@rosesfield/contract"
import { parseComfyWorkflow, resolveBinding } from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { listApps } from "#list-apps"
import { app, motionApp } from "#motion/app"
import { exampleAgentNotes, isFinalRun } from "#motion/examples/example-agent"
import {
  approvedExamples,
  exampleOf,
  libraryExamples,
} from "#motion/examples/library-examples"
import {
  canTryDrafts,
  offeredExamples,
  offeredMotionApp,
  type ServerReach,
  withOfferedExamples,
} from "#motion/examples/offered-examples"

const photo = assetIdFormat.parse("0d9c8b7a-6f5e-4d3c-9b2a-1f0e9d8c7b6a")
const clip = assetIdFormat.parse("1e0d9c8b-7a6f-4e5d-8c3b-2a1f0e9d8c7b")

const local: ServerReach = { mode: "owner", lock: "local" }
const token: ServerReach = { mode: "owner", lock: "token" }
const visitor: ServerReach = { mode: "public", lock: "none" }

const motion = appDefinition.parse(app)
const body = startRunBodyFor(motion)

function choiceOf(inputs: readonly InputDefinition[], name: string): string[] {
  const input = inputs.find((one) => one.name === name)
  return input?.type === "choice"
    ? input.options.map((option) => option.value)
    : []
}

describe("Motion's one mode with its Library", () => {
  it("takes your own video by default, or an approved example, and no other", () => {
    expect(choiceOf(motion.inputs, "example")).toEqual(["own", "grab-and-run"])
    expect(
      body.parse({ inputs: { photo: [photo], clip: [clip] } }).inputs.example
    ).toBe("own")
    expect(
      body.safeParse({
        inputs: { example: "ticket-wipe", photo: [photo] },
      }).success
    ).toBe(false)
  })

  it("asks only for your image with an example, and refuses a clip beside it", () => {
    expect(
      body.safeParse({
        inputs: { example: "grab-and-run", photo: [photo], resolution: "720p" },
      }).success
    ).toBe(true)
    expect(
      body.safeParse({
        inputs: { example: "grab-and-run", photo: [photo], clip: [clip] },
      }).success
    ).toBe(false)
    expect(
      body.safeParse({ inputs: { example: "own", photo: [photo] } }).success
    ).toBe(false)
  })

  it("offers a guided example at 480p and 720p only", () => {
    expect(
      body.safeParse({
        inputs: {
          example: "grab-and-run",
          photo: [photo],
          resolution: "1080p",
        },
      }).success
    ).toBe(false)
  })

  it("runs an example from an image only, with its guide as a file the engine holds and never as an input of the run", () => {
    const bound = parseComfyWorkflow(
      resolveBinding(motion.engine, {
        example: "grab-and-run",
        model: "ltx-2-3-control",
        photo: [photo],
        resolution: "720p",
      })
    )
    expect(bound.bindings).toContainEqual({
      from: "file",
      name: "grab-and-run.mp4",
      path: ["199", "inputs", "file"],
    })
    const scene = bound.bindings.find(
      (one) => one.from === "input" && one.name === "example"
    )
    expect(scene?.from === "input" && scene.map?.["grab-and-run"]).toBe(
      exampleOf("grab-and-run").prompt
    )
    expect(motion.inputs.map((input) => input.name)).not.toContain("guide")
  })

  it("runs Push into the eye on the first-and-last-frame graph once it is offered", () => {
    const offered = appDefinition.parse(motionApp([exampleOf("push-into-eye")]))
    const bound = parseComfyWorkflow(
      resolveBinding(offered.engine, {
        example: "push-into-eye",
        model: "ltx-2-3-control",
        photo: [photo],
        resolution: "480p",
      })
    )
    expect(bound.workflow["395"]).toMatchObject({ class_type: "LoadImage" })
    expect(bound.bindings).toContainEqual(
      expect.objectContaining({ from: "input", name: "photo", index: 0 })
    )
  })
})

describe("the examples a server offers", () => {
  it("lets only an owner server on the local lock try the examples not yet approved", () => {
    expect(canTryDrafts(local)).toBe(true)
    expect(canTryDrafts(token)).toBe(false)
    expect(canTryDrafts(visitor)).toBe(false)
    expect(offeredExamples(libraryExamples, local)).toHaveLength(
      libraryExamples.length
    )
  })

  it.each([
    ["an owner token", token],
    ["public mode", visitor],
  ])("offers only the approved examples behind %s", (_, reach) => {
    expect(offeredExamples(libraryExamples, reach)).toEqual(approvedExamples)
    expect(
      choiceOf(offeredMotionApp(libraryExamples, reach).inputs, "example")
    ).toEqual(["own", "grab-and-run"])
  })

  it("swaps in Motion with the drafts on the local lock, and leaves the list alone elsewhere", () => {
    const apps = listApps()
    expect(withOfferedExamples(apps, token)).toBe(apps)
    const motionWithDrafts = withOfferedExamples(apps, local).find(
      (one) => one.id === "motion"
    )
    expect(choiceOf(motionWithDrafts?.inputs ?? [], "example")).toContain(
      "ticket-wipe"
    )
  })
})

describe("the agent's draft and final of an example", () => {
  it("holds every example run that is not explicitly 480p for the person's yes, and no own-video run", () => {
    expect(
      isFinalRun("motion", { example: "grab-and-run", resolution: "720p" })
    ).toBe(true)
    expect(
      isFinalRun("motion", { example: "grab-and-run", resolution: "480p" })
    ).toBe(false)
    expect(isFinalRun("motion", { example: "grab-and-run" })).toBe(true)
    expect(isFinalRun("motion", { example: "own", resolution: "720p" })).toBe(
      false
    )
    expect(
      isFinalRun("video", { example: "grab-and-run", resolution: "720p" })
    ).toBe(false)
  })

  it("names each offered example's need and no engine word", () => {
    const notes = exampleAgentNotes(motion)
    expect(notes).toContain("grab-and-run: ")
    expect(notes).not.toMatch(/guide|depth|adapter|preset|sha256|graph/i)
  })
})
