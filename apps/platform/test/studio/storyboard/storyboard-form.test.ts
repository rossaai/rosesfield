import { appDefinition, startRunBodyFor } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { tCatalog } from "@/copy/t"
import { bodyOf, type FormValues } from "@/screens/app/app-form"
import {
  messagesOf,
  runValues,
  scenesOf,
  withScenes,
} from "@/studio/storyboard/use-storyboard-screen"
import { app } from "../../../../../packages/catalog/src/storyboard/app"

const definition = appDefinition.parse(app)
const assetId = "1e3a5c7e-9b2d-4f6a-8c0e-2b4d6f8a0c1e"
const characterId = "4c6e8a0c-2e4a-4b6c-9d0e-6a8c0e2a4c6e"

function form(inputs: FormValues["inputs"], count: number): FormValues {
  return { inputs, seedMode: "random", count, aspectRatio: "16:9" }
}

function contractTakes(values: FormValues): boolean {
  const body = bodyOf(definition, runValues(values))
  return startRunBodyFor(definition).safeParse(body).success
}

describe("the Storyboard form", () => {
  it("numbers the scenes in the order you set and sends that order with its scene count", () => {
    const start = withScenes(form({}, 1), [
      "the door",
      "the stairs",
      "the roof",
    ])
    const scenes = scenesOf(start)
    const moved = [scenes[2] ?? "", scenes[0] ?? "", scenes[1] ?? ""]
    const removed = moved.filter((_, index) => index !== 2)
    const sent = runValues(withScenes(start, removed))
    expect(sent.count).toBe(2)
    expect(sent.inputs).toMatchObject({
      sceneCount: "2",
      scene1: "the roof",
      scene2: "the door",
      scene3: "",
    })
    expect(sent.inputs.anchor).toBeUndefined()
  })

  it("sends runs the contract takes from a reference, a character or neither", () => {
    const scenes = { scene1: "a fox", scene2: "a den" }
    expect(contractTakes(form({ ...scenes, reference: [assetId] }, 2))).toBe(
      true
    )
    expect(
      contractTakes(form({ ...scenes, character: [characterId] }, 2))
    ).toBe(true)
    expect(contractTakes(form(scenes, 2))).toBe(true)
  })

  it("refuses a reference and a character together and an empty scene, as the contract does, and keeps every other input", () => {
    const values = form(
      {
        reference: [assetId],
        character: [characterId],
        scene1: "a fox",
        scene2: "  ",
        look: "fog",
      },
      2
    )
    const messages = messagesOf(values, null)
    expect([...messages.keys()]).toEqual(["reference", "scene2"])
    expect(messages.get("reference")).toBe(
      tCatalog("storyboard.input.anchor.both")
    )
    expect(values.inputs.look).toBe("fog")
    expect(contractTakes(values)).toBe(false)
  })

  it("passes a full form with no message, and the contract takes it", () => {
    const values = form(
      { reference: [assetId], scene1: "a fox", look: "fog" },
      1
    )
    expect(messagesOf(values, null).size).toBe(0)
    expect(contractTakes(values)).toBe(true)
  })

  it("takes a fixed seed anywhere in the contract's seed range", () => {
    const values: FormValues = {
      ...form({ scene1: "a fox", seed: 2_147_483_647 }, 1),
      seedMode: "fixed",
    }
    expect(messagesOf(values, null).size).toBe(0)
    expect(contractTakes(values)).toBe(true)
  })
})
