import { keyframesOf } from "@rosesfield/catalog/storyboard"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { tCatalog } from "@/copy/t"
import { KeyframePrompts } from "@/studio/storyboard/keyframe-info"
import { storyboardRun } from "./storyboard-screen"

afterEach(cleanup)

const look = "late afternoon light"
const scenes = ["a girl opens a bakery door", "she kneads dough", "bread"]

describe("the prompt History shows for each Storyboard keyframe", () => {
  it("lists each keyframe by number with its own scene and then the look, in scene order", () => {
    const made = storyboardRun({
      inputs: {
        sceneCount: "3",
        scene1: scenes[0],
        scene2: scenes[1],
        scene3: scenes[2],
        look,
      },
      count: 3,
    })
    render(<KeyframePrompts keyframes={keyframesOf(made)} />)
    const terms = screen.getAllByRole("term").map((term) => term.textContent)
    const prompts = screen
      .getAllByRole("definition")
      .map((definition) => definition.textContent)
    expect(terms).toEqual(
      [1, 2, 3].map((number) =>
        tCatalog("storyboard.keyframe.number", { number })
      )
    )
    expect(prompts).toEqual(scenes.map((scene) => `${scene} ${look}`))
  })
})
